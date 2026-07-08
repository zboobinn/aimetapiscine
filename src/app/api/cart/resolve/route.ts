import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllProducts } from "@/lib/catalog/data";
import { withLivePricing } from "@/lib/catalog/live-pricing";
import { getBusinessConfigEnv } from "@/lib/env";
import { computeLineDiscountsBps } from "@/lib/pricing/discounts";
import { computeLineCharge } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import type { PricingRole } from "@/lib/pricing/types";
import { SHIPPING_DELAY_LABEL, getShippingFee } from "@/lib/shipping/get-shipping-fee";
import { isExcludedOverseasPostalCode } from "@/lib/shipping/postal-code";

/**
 * Résolution serveur des prix du panier (09/23) : le client n'envoie que
 * SKU + quantités, jamais de montant. Le rôle et les prix viennent
 * exclusivement du catalogue lu ici, comme sur le reste du site (04) — la
 * bascule PRO_VERIFIED (14) ne change que `resolvePricingRole()`.
 *
 * `postalCode` optionnel (12) : simple estimation d'affichage (port, surcoût
 * Corse) avant paiement — le montant réellement facturé est recalculé une
 * seconde fois par `/api/checkout`, seule source de vérité côté Stripe.
 */

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
        source: z.enum(["catalog", "pack"]).default("catalog"),
        packId: z.string().optional(),
      }),
    )
    .max(200),
  // Manifeste des packs présents au panier (13) : SKUs d'origine par
  // `packId`, capturés côté client à l'ajout — sert à détecter qu'un article
  // du pack a été retiré depuis (la remise pack disparaît alors). Donnée
  // structurelle du panier, jamais un montant (23) : le client dit CE QU'IL Y
  // A, le serveur décide du PRIX.
  packs: z.record(z.string(), z.object({ originalSkus: z.array(z.string().min(1)) })).default({}),
  postalCode: z.string().trim().min(1).optional(),
});

export interface ResolvedCartLine {
  sku: string;
  slug: string;
  name: string;
  image: string;
  unit: string;
  category: string;
  quantity: number;
  /** HT unitaire (prix catalogue résolu pour CE rôle, 14) — affiché tel quel à un pro (« PU HT »). */
  unitHtCents: number;
  vatRateBps: number;
  /** HT total de la ligne, remise pack (13) déjà déduite. */
  lineHtCents: number;
  /** TVA totale de la ligne. */
  lineVatCents: number;
  /**
   * Montant RÉELLEMENT dû pour cette ligne (HT remisé + TVA) — calculé par
   * la MÊME fonction que `/api/checkout` (`computeLineCharge`, 10/13/14) :
   * ce que le panier affiche est, au centime près, ce qui sera débité.
   */
  lineTtcCents: number;
  /** TTC ligne avant remise — présent uniquement si `discountBps > 0` (prix barré, 05). */
  compareAtLineTtcCents?: number;
  discountBps: number;
  /** `false` si le SKU est introuvable ou hors stock : la ligne doit être signalée et purgeable côté UI (09). */
  available: boolean;
}

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
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const role = await resolvePricingRole();
  const products = await withLivePricing(getAllProducts());

  const discountBpsRate = getBusinessConfigEnv().PACK_DISCOUNT_BPS;
  const discountBpsByLine = computeLineDiscountsBps(
    parsed.data.lines,
    parsed.data.packs,
    discountBpsRate,
  );

  const lines: ResolvedCartLine[] = await Promise.all(
    parsed.data.lines.map(async ({ sku, quantity }, index) => {
      const product = products.find((p) => p.sku === sku);

      if (!product) {
        return {
          sku,
          slug: sku,
          name: "Produit indisponible",
          image: "",
          unit: "unite",
          category: "AUTRE",
          quantity,
          unitHtCents: 0,
          vatRateBps: 0,
          lineHtCents: 0,
          lineVatCents: 0,
          lineTtcCents: 0,
          discountBps: 0,
          available: false,
        };
      }

      const discountBps = discountBpsByLine[index];
      // Même fonction qu'au checkout (`computeLineCharge`) : garantit que le
      // montant affiché ici est EXACTEMENT celui qui sera facturé (10/13/23).
      const charge = await computeLineCharge(product, role, quantity, discountBps);
      const compareAtLineTtcCents =
        discountBps > 0
          ? (await computeLineCharge(product, role, quantity, 0)).lineTtcCents
          : undefined;

      return {
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        image: product.image,
        unit: product.unit,
        category: product.category,
        quantity,
        unitHtCents: charge.unitHtCents,
        vatRateBps: product.vat_rate,
        lineHtCents: charge.lineHtCents,
        lineVatCents: charge.lineVatCents,
        lineTtcCents: charge.lineTtcCents,
        compareAtLineTtcCents,
        discountBps,
        available: product.in_stock,
      };
    }),
  );

  const { postalCode } = parsed.data;
  const zoneExcluded = Boolean(postalCode && isExcludedOverseasPostalCode(postalCode));
  const { amountCents, corsicaSurchargeApplied } = zoneExcluded
    ? { amountCents: 0, corsicaSurchargeApplied: false }
    : getShippingFee(
        parsed.data.lines,
        role,
        postalCode ? { postalCode } : undefined,
      );

  const response: ResolveCartResponse = {
    role,
    lines,
    shipping: { amountCents, corsicaSurchargeApplied, delayLabel: SHIPPING_DELAY_LABEL, zoneExcluded },
  };
  return NextResponse.json(response);
}
