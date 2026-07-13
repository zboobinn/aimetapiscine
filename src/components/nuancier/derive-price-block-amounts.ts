import { computeLineChargeFromUnitHt } from "@/lib/pricing/resolve-price";

export interface PriceBlockAmounts {
  /** Montant de ligne réellement dû (HT remisé + TVA) — même valeur que panier/checkout/facture. */
  lineTtcCents: number;
  /** €/m² dérivé du total de ligne, remise incluse (D6) — jamais de unitAmountCents / roll_area_m2. */
  pricePerM2Cents: number | null;
}

/**
 * Dérive le total et le €/m² à partir de `computeLineChargeFromUnitHt`
 * (`src/lib/pricing/resolve-price.ts`, la même fonction de ligne que
 * `/api/cart/resolve`, `/api/checkout` et `lib/pdf/invoice.ts`, docs/decisions.md
 * 2026-07-10 « arrondi par unité puis multiplication »). `unitAmountCents ×
 * quantity` dérive d'un centime dès que le HT unitaire tombe sur des centimes
 * impairs à quantité ≥ 2 — exactement le bug déjà corrigé une fois côté
 * panier/checkout, réintroduit ici puis re-corrigé. Pas de remise pack sur
 * cette galerie de démonstration (`discountBps = 0`), mais le calcul passe
 * quand même par la fonction partagée pour que le total et le €/m² restent
 * cohérents avec le futur usage réel (29/30) si une remise est un jour passée.
 */
export function derivePriceBlockAmounts(
  unitHtCents: number,
  quantity: number,
  vatRateBps: number,
  rollAreaM2: number | null,
): PriceBlockAmounts {
  const { lineTtcCents } = computeLineChargeFromUnitHt(unitHtCents, quantity, 0, vatRateBps);
  const pricePerM2Cents = rollAreaM2 ? lineTtcCents / (rollAreaM2 * quantity) : null;
  return { lineTtcCents, pricePerM2Cents };
}
