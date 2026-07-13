export interface LineCharge {
  /** HT unitaire (prix catalogue résolu pour ce rôle), avant remise — affiché tel quel à un PRO_VERIFIED (« PU HT »). */
  unitHtCents: number;
  /** HT total de la ligne avant remise (`unitHtCents × quantity`). */
  lineHtBeforeDiscountCents: number;
  discountHtCents: number;
  /** HT total de la ligne, remise pack (13) déjà déduite. */
  lineHtCents: number;
  /** TVA totale de la ligne, calculée sur le HT déjà remisé. */
  lineVatCents: number;
  /**
   * Montant RÉELLEMENT dû pour cette ligne (HT remisé + TVA). Source UNIQUE
   * de vérité, utilisée à l'identique par `/api/cart/resolve` (affichage
   * panier) et `/api/checkout` (montant Stripe encaissé, quantité toujours
   * repliée à 1 pour que ce nombre soit exactement le `unit_amount` facturé,
   * 10/13/23) : ce qui est affiché avant de payer est ce qui est débité.
   */
  lineTtcCents: number;
}

/**
 * Calcul de ligne pur (HT unitaire déjà connu) — pas de dépendance catalogue
 * ni `server-only` : réutilisé tel quel par la génération de facture (11,
 * `lib/pdf/invoice.ts`), par `resolve-price.ts` (serveur) et par le
 * calculateur inline PDP (29b, Client Component) qui a besoin de la même
 * chaîne de prix sans pouvoir importer un module `server-only`. Extrait de
 * `resolve-price.ts` (qui importait `server-only` en tête de fichier et
 * empêchait tout import client de cette fonction pourtant sans I/O) — logique
 * inchangée, seul l'emplacement change (29b).
 */
export function computeLineChargeFromUnitHt(
  unitHtCents: number,
  quantity: number,
  discountBps: number,
  vatRateBps: number,
): LineCharge {
  const lineHtBeforeDiscountCents = unitHtCents * quantity;
  const discountHtCents =
    discountBps > 0 ? Math.round((lineHtBeforeDiscountCents * discountBps) / 10000) : 0;
  const lineHtCents = lineHtBeforeDiscountCents - discountHtCents;
  const lineVatCents = Math.round((lineHtCents * vatRateBps) / 10000);

  return {
    unitHtCents,
    lineHtBeforeDiscountCents,
    discountHtCents,
    lineHtCents,
    lineVatCents,
    lineTtcCents: lineHtCents + lineVatCents,
  };
}
