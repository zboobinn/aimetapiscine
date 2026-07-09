import { z } from "zod";
import { getAllProducts } from "@/lib/catalog/data";
import { withLivePricing } from "@/lib/catalog/live-pricing";
import { getBusinessConfigEnv } from "@/lib/env";
import { NO_STORE_HEADERS, apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validate";
import { buildResolvedCartLine, buildUnavailableCartLine, type ResolvedCartLine } from "@/lib/cart/resolved-line";
import { computeLineDiscountsBps } from "@/lib/pricing/discounts";
import { computeLineCharge } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import type { PricingRole } from "@/lib/pricing/types";
import { SHIPPING_DELAY_LABEL, getShippingFee } from "@/lib/shipping/get-shipping-fee";
import { isExcludedOverseasPostalCode } from "@/lib/shipping/postal-code";

export const dynamic = "force-dynamic";

/**
 * Résolution serveur des prix du panier (09/23) : le client n'envoie que
 * SLUG + quantités, jamais de montant. Le rôle et les prix viennent
 * exclusivement du catalogue lu ici, comme sur le reste du site (04) — la
 * bascule PRO_VERIFIED (14) ne change que `resolvePricingRole()`.
 *
 * `slug` (jamais `sku`, préfixé `APF-...`) est l'identifiant produit qui
 * transite entre client et serveur (23, decisions.md) — le blind shipping
 * (01) s'applique à toute réponse d'API au même titre qu'un texte visible.
 *
 * `postalCode` optionnel (12) : simple estimation d'affichage (port, surcoût
 * Corse) avant paiement — le montant réellement facturé est recalculé une
 * seconde fois par `/api/checkout`, seule source de vérité côté Stripe.
 */

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
    .max(200),
  // Manifeste des packs présents au panier (13) : slugs d'origine par
  // `packId`, capturés côté client à l'ajout — sert à détecter qu'un article
  // du pack a été retiré depuis (la remise pack disparaît alors). Donnée
  // structurelle du panier, jamais un montant (23) : le client dit CE QU'IL Y
  // A, le serveur décide du PRIX.
  packs: z.record(z.string(), z.object({ originalSlugs: z.array(z.string().min(1)) })).default({}),
  postalCode: z.string().trim().min(1).optional(),
});

export type { ResolvedCartLine };

export interface ShippingEstimate {
  amountCents: number;
  corsicaSurchargeApplied: boolean;
  delayLabel: string;
  /** `true` si le code postal saisi est hors zone de livraison V1 (DOM-TOM). */
  zoneExcluded: boolean;
}

export interface ResolveCartResponse {
  role: PricingRole;
  lines: ResolvedCartLine[];
  shipping: ShippingEstimate;
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if ("response" in parsed) return parsed.response;
  const { data } = parsed;

  const role = await resolvePricingRole();
  const products = await withLivePricing(getAllProducts());

  const discountBpsRate = getBusinessConfigEnv().PACK_DISCOUNT_BPS;
  const discountBpsByLine = computeLineDiscountsBps(
    data.lines,
    data.packs,
    discountBpsRate,
  );

  const lines: ResolvedCartLine[] = await Promise.all(
    data.lines.map(async ({ slug, quantity }, index) => {
      const product = products.find((p) => p.slug === slug);

      if (!product) {
        return buildUnavailableCartLine(slug, quantity);
      }

      const discountBps = discountBpsByLine[index];
      // Même fonction qu'au checkout (`computeLineCharge`) : garantit que le
      // montant affiché ici est EXACTEMENT celui qui sera facturé (10/13/23).
      const charge = await computeLineCharge(product, role, quantity, discountBps);
      const compareAtLineTtcCents =
        discountBps > 0
          ? (await computeLineCharge(product, role, quantity, 0)).lineTtcCents
          : undefined;

      return buildResolvedCartLine(product, quantity, discountBps, charge, compareAtLineTtcCents);
    }),
  );

  const { postalCode } = data;
  const zoneExcluded = Boolean(postalCode && isExcludedOverseasPostalCode(postalCode));
  const { amountCents, corsicaSurchargeApplied } = zoneExcluded
    ? { amountCents: 0, corsicaSurchargeApplied: false }
    : getShippingFee(
        data.lines,
        role,
        postalCode ? { postalCode } : undefined,
      );

  const response: ResolveCartResponse = {
    role,
    lines,
    shipping: { amountCents, corsicaSurchargeApplied, delayLabel: SHIPPING_DELAY_LABEL, zoneExcluded },
  };
  return apiSuccess(response, { headers: NO_STORE_HEADERS });
}
