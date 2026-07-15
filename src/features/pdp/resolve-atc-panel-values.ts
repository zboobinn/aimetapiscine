import type { RecalculatedPdpResult } from "./recalculate-buy-box";

export interface CheckedAccessoriesTotals {
  count: number;
  /** Sous-total TTC/HT des accessoires COCHÉS, remise pack déjà incluse (`computeChecklistPackAmounts`, 29c②). */
  subtotalCents: number;
}

export interface AtcPanelValues {
  surfaceM2: number;
  /** Prix au m² de la MEMBRANE (jamais des accessoires) — inchangé par la checklist (29c②, correctif invariant panier). */
  pricePerM2Cents: number | null;
  membraneQuantity: number;
  membraneSubtotalCents: number;
  /** Nombre d'accessoires cochés (0 si aucun) — pilote l'affichage de la ligne « Accessoires » (29c②). */
  accessoriesCount: number;
  /** Sous-total des accessoires cochés, remise incluse — 0 si aucun. */
  accessoriesSubtotalCents: number;
  shippingCents: number;
  /**
   * Membrane + accessoires cochés + livraison — INVARIANT : doit rester
   * strictement égal à `computeChecklistPackAmounts(...).totalCents +
   * shippingCents` (29c②, correctif « le total affiché ment »). Avant ce
   * correctif, ce total ignorait les accessoires cochés bien qu'`addPackLines`
   * les envoie au panier : cocher un item faisait BAISSER le total affiché
   * (membrane remisée) alors que le panier facturait PLUS cher (accessoires
   * ajoutés). Le panier reste la source de vérité (23) ; ce total doit
   * toujours pouvoir être reconstitué par le lecteur : Membrane + Accessoires
   * + Livraison.
   *
   * TOUJOURS TTC, quel que soit le rôle (29c② partie A, correctif « le
   * libellé ment ») : c'est le montant réellement encaissé par Stripe et
   * affiché par le panier en « Total à payer (TTC) » (09/10) —
   * `computeLineChargeFromUnitHt` ajoute la TVA sur le HT (remisé ou non) que
   * le rôle soit b2c ou b2b, un pro français payant aussi la TVA au moment de
   * payer (11, réclamable ensuite). Seul le HT unitaire d'une ligne peut
   * légitimement s'afficher sans TVA pour un pro (comme le panier le fait
   * déjà, `panier-client.tsx`) — jamais le total.
   */
  totalCents: number;
  totalLabel: "TTC";
}

const NO_CHECKED_ACCESSORIES: CheckedAccessoriesTotals = { count: 0, subtotalCents: 0 };

/**
 * Seul point qui dérive les valeurs affichées du bloc prix (29 §4, 29c②) à
 * partir de `RecalculatedPdpResult` (29b①) ET des accessoires COCHÉS dans la
 * checklist de chantier (`computeChecklistPackAmounts`, 29c②) — appelé UNE
 * FOIS par rendu dans `PdpProvider`, le résultat est ensuite lu par la
 * buy-box desktop, le drawer ATC mobile, la barre fixe mobile ET le bouton
 * « Valider » (29c①) : aucune de ces quatre vues ne recalcule quoi que ce
 * soit séparément, ce qui rend une divergence de chiffres — ou une
 * divergence avec ce que le panier facturera — structurellement impossible.
 */
export function resolveAtcPanelValues(
  result: RecalculatedPdpResult,
  checkedAccessories: CheckedAccessoriesTotals = NO_CHECKED_ACCESSORIES,
): AtcPanelValues {
  return {
    surfaceM2: result.surface.grossM2,
    pricePerM2Cents: result.buyBox.pricePerM2Cents,
    membraneQuantity: result.membrane.quantity,
    membraneSubtotalCents: result.buyBox.membraneSubtotalCents,
    accessoriesCount: checkedAccessories.count,
    accessoriesSubtotalCents: checkedAccessories.subtotalCents,
    shippingCents: result.buyBox.shippingCents,
    totalCents:
      result.buyBox.membraneSubtotalCents + checkedAccessories.subtotalCents + result.buyBox.shippingCents,
    totalLabel: "TTC",
  };
}
