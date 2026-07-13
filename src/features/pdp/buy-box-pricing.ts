import "server-only";

import { derivePriceBlockAmounts } from "@/components/nuancier/derive-price-block-amounts";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import type { PricingRole } from "@/lib/pricing/types";
import { getShippingFee } from "@/lib/shipping/get-shipping-fee";

export interface PdpBuyBoxAmounts {
  /** Prix unitaire affiché (TTC en b2c, HT en b2b) — `resolvePriceBreakdown().unitAmountCents`. */
  unitAmountCents: number;
  /**
   * Prix au m² (D6, choix A) — sous-total membrane divisé par la surface
   * COUVERTE (`surface.grossM2` du calculateur, 08), pas par
   * `rollAreaM2 × quantity` (qui inclut l'arrondi au rouleau supérieur et
   * gonflerait artificiellement le dénominateur, cf. maquette 1 240 € /
   * 46,4 m² = 26,72 €, docs/29-page-produit.md). Même numérateur canonique
   * que `PriceBlock`/`derivePriceBlockAmounts` (28b) — seul le dénominateur
   * d'affichage change ici, aucune chaîne de prix parallèle.
   */
  pricePerM2Cents: number | null;
  /** Sous-total membrane (rouleaux × prix unitaire, remise incluse) — `computeLineChargeFromUnitHt`. */
  membraneSubtotalCents: number;
  /** Livraison estimée — `getShippingFee()` (12), surcharge Corse incluse si adresse connue. */
  shippingCents: number;
  /** Total estimé = sous-total membrane + livraison. */
  totalCents: number;
}

/**
 * Point d'entrée UNIQUE des 4 valeurs de la buy-box PDP (29, D6) : toutes
 * dérivées de `resolvePriceBreakdown()` (même fonction que panier/checkout/
 * facture/PriceBlock, 28b) puis `derivePriceBlockAmounts` pour le sous-total
 * membrane (jamais `unitAmountCents × quantity`, cf. correctif 28b du
 * 2026-07-13), et `getShippingFee()` (12) pour la livraison. Aucun second
 * chemin de calcul : si une de ces valeurs doit changer, elle change ici et
 * nulle part ailleurs. `coveredAreaM2` (surface couverte, 08) pilote
 * uniquement le dénominateur d'affichage du €/m² — `derivePriceBlockAmounts`
 * reste inchangé et continue de servir tel quel hors PDP (28b `/_design`).
 */
export async function computePdpBuyBoxAmounts(
  product: CatalogEntry,
  role: PricingRole,
  rollQuantity: number,
  coveredAreaM2: number,
): Promise<PdpBuyBoxAmounts> {
  const { unitAmountCents, unitHtCents } = await resolvePriceBreakdown(product, role);

  const { lineTtcCents: membraneSubtotalCents } = derivePriceBlockAmounts(
    unitHtCents,
    rollQuantity,
    product.vat_rate,
    product.roll_area_m2,
  );

  const pricePerM2Cents =
    coveredAreaM2 > 0 ? Math.round(membraneSubtotalCents / coveredAreaM2) : null;

  const { amountCents: shippingCents } = getShippingFee(
    [{ slug: product.slug, quantity: rollQuantity }],
    role,
  );

  return {
    unitAmountCents,
    pricePerM2Cents,
    membraneSubtotalCents,
    shippingCents,
    totalCents: membraneSubtotalCents + shippingCents,
  };
}
