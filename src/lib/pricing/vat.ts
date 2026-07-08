/**
 * Arithmétique HT/TVA pure, sans dépendance catalogue ni Supabase (03) :
 * importable aussi bien côté serveur (`resolve-price.ts`) que depuis un
 * Client Component (`AddToCartButton`, cross-sell) qui reçoit déjà un prix
 * HT résolu par le serveur et doit juste l'afficher en TTC.
 */

/** Aucun produit du catalogue ni frais de port n'a de taux réduit en V1 (03/12). */
export const STANDARD_VAT_RATE_BPS = 2000;

/**
 * Ventile un montant TTC déjà figé en HT/TVA SANS jamais changer le total :
 * `htCents + vatCents === ttcCents` par construction (la TVA est un résidu,
 * pas un second arrondi indépendant). Sert à documenter le détail HT/TVA
 * d'un montant qui n'est jamais recalculé, seulement affiché — ex. frais de
 * port sur la facture (11/12).
 */
export function splitTtcAmount(ttcCents: number, vatRateBps: number): { htCents: number; vatCents: number } {
  const htCents = Math.round((ttcCents * 10000) / (10000 + vatRateBps));
  return { htCents, vatCents: ttcCents - htCents };
}

/**
 * TTC public à afficher pour un particulier à partir du HT catalogue —
 * utilisé par les grilles/fiches produit (07) pour le prix baké dans le
 * HTML ISR avant toute résolution de rôle côté client (`ProPrice`, 14).
 */
export function computePublicTtcCents(baseHtCents: number, vatRateBps: number): number {
  return baseHtCents + Math.round((baseHtCents * vatRateBps) / 10000);
}
