import type { RecalculatedPdpResult } from "./recalculate-buy-box";

export interface AtcPanelValues {
  surfaceM2: number;
  pricePerM2Cents: number | null;
  membraneQuantity: number;
  membraneSubtotalCents: number;
  shippingCents: number;
  totalCents: number;
  totalLabel: "TTC" | "HT";
}

/**
 * Seul point qui dérive les 4 valeurs affichées du bloc prix (29 §4) à
 * partir de `RecalculatedPdpResult` (29b①) — appelé UNE FOIS par rendu dans
 * `PdpCalculator`, le résultat est ensuite lu par la buy-box desktop ET le
 * drawer ATC mobile (29c①) : aucun des deux ne rappelle cette fonction ni
 * `recalculatePdpBuyBoxAmounts` séparément, ce qui rend une divergence de
 * chiffres entre les deux vues structurellement impossible.
 */
export function resolveAtcPanelValues(
  result: RecalculatedPdpResult,
  isProRole: boolean,
): AtcPanelValues {
  return {
    surfaceM2: result.surface.grossM2,
    pricePerM2Cents: result.buyBox.pricePerM2Cents,
    membraneQuantity: result.membrane.quantity,
    membraneSubtotalCents: result.buyBox.membraneSubtotalCents,
    shippingCents: result.buyBox.shippingCents,
    totalCents: result.buyBox.totalCents,
    totalLabel: isProRole ? "HT" : "TTC",
  };
}
