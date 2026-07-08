import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAllProducts } from "@/lib/catalog/data";
import { getSiteEnv } from "@/lib/env";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import { getShippingFee } from "@/lib/shipping/get-shipping-fee";
import { isExcludedOverseasPostalCode } from "@/lib/shipping/postal-code";
import { getStripeClient } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Création de la session Stripe Checkout (10). Le client n'envoie QUE des
 * SKU + quantités : tout montant (prix selon rôle, port) est recalculé ici
 * depuis le catalogue serveur, jamais accepté depuis la requête (23).
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(200),
  // Saisi côté /panier avant paiement (12) : sert au recalcul serveur du
  // port (surcoût Corse) et au refus des DOM-TOM avant même de créer la
  // session Stripe. Optionnel : Stripe collecte de toute façon sa propre
  // adresse (`shipping_address_collection`) à l'étape suivante.
  postalCode: z.string().trim().min(1).optional(),
});

function cartFingerprint(lines: Array<{ sku: string; quantity: number }>): string {
  const normalized = [...lines]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((l) => `${l.sku}:${l.quantity}`)
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (parsed.data.postalCode && isExcludedOverseasPostalCode(parsed.data.postalCode)) {
    return NextResponse.json(
      {
        error: "shipping_zone_excluded",
        message:
          "Nous ne livrons pas les DOM-TOM en V1 : seule la France métropolitaine (Corse incluse) est couverte.",
      },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = await resolvePricingRole();
  const products = getAllProducts();

  const unavailableSkus: string[] = [];
  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; metadata: Record<string, string> };
    };
    quantity: number;
  }> = [];

  for (const { sku, quantity } of parsed.data.lines) {
    const product = products.find((p) => p.sku === sku);

    if (!product || !product.in_stock) {
      unavailableSkus.push(sku);
      continue;
    }

    const { unitAmountCents, unitHtCents } = resolvePriceBreakdown(product, role);

    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: unitAmountCents,
        product_data: {
          name: product.name,
          metadata: { sku: product.sku, unit_ht_cents: String(unitHtCents) },
        },
      },
      quantity,
    });
  }

  if (unavailableSkus.length > 0) {
    return NextResponse.json({ error: "unavailable_items", skus: unavailableSkus }, { status: 409 });
  }

  const shippingAddress = parsed.data.postalCode ? { postalCode: parsed.data.postalCode } : undefined;
  const { amountCents: shippingFeeCents, corsicaSurchargeApplied } = getShippingFee(
    parsed.data.lines,
    role,
    shippingAddress,
  );
  const siteUrl = getSiteEnv().NEXT_PUBLIC_SITE_URL;
  const fingerprint = cartFingerprint(parsed.data.lines);

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
    return NextResponse.json({ error: "session_creation_failed" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
