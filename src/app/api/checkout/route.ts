import { createHash } from "node:crypto";

import { z } from "zod";

import { ApiErrorCode } from "@/lib/api/errors";
import { NO_STORE_HEADERS, apiError, apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validate";
import { getLiveCatalogEntries } from "@/lib/catalog/live-catalog";
import { getBusinessConfigEnv, getSiteEnv } from "@/lib/env";
import { computeLineDiscountsBps } from "@/lib/pricing/discounts";
import { computeLineCharge } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import { checkCheckoutRateLimit } from "@/lib/security/rate-limit";
import { getShippingFee } from "@/lib/shipping/get-shipping-fee";
import { isExcludedOverseasPostalCode } from "@/lib/shipping/postal-code";
import { getStripeClient } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Création de la session Stripe Checkout (10). Le client n'envoie QUE des
 * SLUG + quantités : tout montant (prix selon rôle, port) est recalculé ici
 * depuis le catalogue serveur, jamais accepté depuis la requête (23). `slug`
 * est le seul identifiant transmis par le client — la ligne Stripe ne
 * transporte que `variant_id` (UUID `product_variants.id`) en métadonnée
 * interne (serveur à serveur, jamais rendu au navigateur) : JAMAIS `ref_apf`,
 * server-only par construction, Stripe n'a pas à le connaître (tranche 2).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().positive(),
        source: z.enum(["catalog", "pack"]).default("catalog"),
        packId: z.string().optional(),
      }),
    )
    .min(1)
    .max(200),
  // Manifeste des packs présents au panier (13, même contrat que
  // /api/cart/resolve) : détermine quelles lignes gardent la remise pack -5 %
  // au moment de payer — recalculé ici, jamais accepté tel quel du client.
  packs: z.record(z.string(), z.object({ originalSlugs: z.array(z.string().min(1)) })).default({}),
  // Saisi côté /panier avant paiement (12) : sert au recalcul serveur du
  // port (surcoût Corse) et au refus des DOM-TOM avant même de créer la
  // session Stripe. Optionnel : Stripe collecte de toute façon sa propre
  // adresse (`shipping_address_collection`) à l'étape suivante.
  postalCode: z.string().trim().min(1).optional(),
});

function cartFingerprint(lines: Array<{ slug: string; quantity: number }>): string {
  const normalized = [...lines]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((l) => `${l.slug}:${l.quantity}`)
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  // Rate limiter en tête de handler (23), avant toute autre logique : un
  // quota dépassé ne doit même pas déclencher la validation du corps.
  const rateLimitUser = await createClient();
  const {
    data: { user: rateLimitCallerUser },
  } = await rateLimitUser.auth.getUser();
  const rateLimit = await checkCheckoutRateLimit(request, rateLimitCallerUser?.id ?? null);
  if (!rateLimit.allowed) {
    return apiError(
      ApiErrorCode.RATE_LIMITED,
      "Trop de tentatives de paiement. Merci de réessayer dans quelques instants.",
      { headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if ("response" in parsed) return parsed.response;
  const { data } = parsed;

  if (data.postalCode && isExcludedOverseasPostalCode(data.postalCode)) {
    return apiError(
      ApiErrorCode.SHIPPING_ZONE_EXCLUDED,
      "Nous ne livrons pas les DOM-TOM en V1 : seule la France métropolitaine (Corse incluse) est couverte.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await resolvePricingRole();
  // Même résolution de variante que /api/cart/resolve (tranche 2) : une
  // seule source de prix live, jamais un second chemin de lecture.
  const catalog = await getLiveCatalogEntries();

  const unavailableSlugs: string[] = [];
  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; metadata: Record<string, string> };
    };
    quantity: number;
  }> = [];

  const discountBpsRate = getBusinessConfigEnv().PACK_DISCOUNT_BPS;
  const discountBpsByLine = computeLineDiscountsBps(
    data.lines,
    data.packs,
    discountBpsRate,
  );

  for (const [index, { slug, quantity }] of data.lines.entries()) {
    const match = catalog.find((c) => c.entry.slug === slug);

    if (!match || !match.entry.in_stock) {
      unavailableSlugs.push(slug);
      continue;
    }

    const { entry: product, variantId } = match;
    const discountBps = discountBpsByLine[index];
    // Point d'entrée UNIQUE du calcul de ligne (`lib/pricing/resolve-price.ts`),
    // partagé à l'identique avec `/api/cart/resolve` (affichage panier) : le
    // montant vu avant paiement et le montant Stripe encaissé ne peuvent donc
    // jamais diverger — ni sur le HT/TVA d'un pro, ni sur un arrondi de ligne.
    const charge = await computeLineCharge(product, role, quantity, discountBps, variantId);

    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: charge.lineTtcCents,
        product_data: {
          name: discountBps > 0 ? `${product.name} (Pack -${discountBps / 100} %)` : product.name,
          metadata: {
            variant_id: variantId,
            unit_ht_cents: String(charge.unitHtCents),
            discount_bps: String(discountBps),
            quantity: String(quantity),
          },
        },
      },
      // Quantité TOUJOURS repliée à 1 (13/23) : `unit_amount` porte alors le
      // montant EXACT de la ligne entière (`lineTtcCents`), sans jamais
      // dépendre de l'arrondi implicite de Stripe (unit_amount × quantity) —
      // la vraie quantité voyage en métadonnée pour le webhook (10/11).
      quantity: 1,
    });
  }

  if (unavailableSlugs.length > 0) {
    // Le SKU (préfixé APF-..., 04) ne doit jamais apparaître dans une réponse
    // client (règle blind shipping, 01/23) : message générique, pas de liste.
    return apiError(
      ApiErrorCode.ITEMS_UNAVAILABLE,
      "Un ou plusieurs articles du panier ne sont plus disponibles. Actualisez votre panier avant de réessayer.",
    );
  }

  const shippingAddress = data.postalCode ? { postalCode: data.postalCode } : undefined;
  const { amountCents: shippingFeeCents, corsicaSurchargeApplied } = getShippingFee(
    data.lines,
    role,
    shippingAddress,
  );
  const siteUrl = getSiteEnv().NEXT_PUBLIC_SITE_URL;
  const fingerprint = cartFingerprint(data.lines);

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ["FR"] },
    shipping_options:
      shippingFeeCents > 0
        ? [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: shippingFeeCents, currency: "eur" },
                display_name: corsicaSurchargeApplied
                  ? "Livraison Corse (surcoût transporteur)"
                  : "Livraison standard",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 5 },
                  maximum: { unit: "business_day", value: 10 },
                },
              },
            },
          ]
        : undefined,
    customer_email: user?.email,
    success_url: `${siteUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/panier`,
    metadata: {
      user_id: user?.id ?? "",
      cart_fingerprint: fingerprint,
    },
  });

  if (!session.url) {
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Impossible de créer la session de paiement.");
  }

  return apiSuccess({ url: session.url }, { headers: NO_STORE_HEADERS });
}
