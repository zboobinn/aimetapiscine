import type { CatalogEntry } from "@/lib/catalog/schema";
import type { PricingRole } from "./types";

/** Aucun produit du catalogue ni frais de port n'a de taux réduit en V1 (03/12). */
export const STANDARD_VAT_RATE_BPS = 2000;

export interface PriceBreakdown {
  /** Montant réellement encaissé (10) : TTC dans les deux rôles. */
  unitAmountCents: number;
  /** Montant HT — snapshot stocké sur `order_items.unit_price_ht` (03). */
  unitHtCents: number;
}

/**
 * Ventile un montant TTC déjà figé en HT/TVA SANS jamais changer le total :
 * `htCents + vatCents === ttcCents` par construction (la TVA est un résidu,
 * pas un second arrondi indépendant). Sert à documenter le détail HT/TVA
 * d'un montant qui n'est jamais recalculé, seulement affiché — ex. frais de
 * port sur la facture (11/12), ou prix public TTC (b2c) ventilé ci-dessous.
 */
export function splitTtcAmount(ttcCents: number, vatRateBps: number): { htCents: number; vatCents: number } {
  const htCents = Math.round((ttcCents * 10000) / (10000 + vatRateBps));
  return { htCents, vatCents: ttcCents - htCents };
}

/**
 * Ventile le prix unitaire en HT/TTC pour l'encaissement (10) et le snapshot
 * commande (03). b2c : `base_price_ht` est déjà le TTC affiché — le HT s'en
 * déduit. b2b : `pro_price_ht` est le HT — la TVA s'ajoute par-dessus, les
 * pros la payant aussi (13).
 */
export function resolvePriceBreakdown(product: CatalogEntry, role: PricingRole): PriceBreakdown {
  const vatRateBps = product.vat_rate;

  if (role === "b2b") {
    const unitHtCents = product.pro_price_ht;
    const unitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
    return { unitAmountCents, unitHtCents };
  }

  const unitAmountCents = product.base_price_ht;
  const { htCents: unitHtCents } = splitTtcAmount(unitAmountCents, vatRateBps);
  return { unitAmountCents, unitHtCents };
}

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
 * Calcul de ligne pur (HT unitaire déjà connu) — pas de dépendance catalogue,
 * réutilisé tel quel par la génération de facture (11, `lib/pdf/invoice.ts`)
 * à partir du snapshot `order_items` (HT/quantité/remise/TVA déjà enregistrés,
 * jamais recalculés depuis un rôle qui n'a plus de sens après la vente).
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

/**
 * Point d'entrée unique pour chiffrer une ligne de panier/checkout à partir
 * du catalogue (04) : résout le HT unitaire pour CE rôle (14) puis applique
 * la même formule que la facture (11). `/api/cart/resolve` et `/api/checkout`
 * appellent tous les deux CETTE fonction — jamais de calcul dupliqué qui
 * pourrait diverger entre panier affiché et montant payé.
 */
export function computeLineCharge(
  product: CatalogEntry,
  role: PricingRole,
  quantity: number,
  discountBps: number,
): LineCharge {
  const { unitHtCents } = resolvePriceBreakdown(product, role);
  return computeLineChargeFromUnitHt(unitHtCents, quantity, discountBps, product.vat_rate);
}
