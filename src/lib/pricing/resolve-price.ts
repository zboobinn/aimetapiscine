import "server-only";

import type { CatalogEntry } from "@/lib/catalog/schema";
import { getProDiscountBps } from "@/lib/store-settings";
import type { PricingRole } from "./types";

export { STANDARD_VAT_RATE_BPS, computePublicTtcCents, splitTtcAmount } from "./vat";

export interface PriceBreakdown {
  /**
   * Montant à AFFICHER pour ce rôle : TTC en b2c (`base_price_ht × (1 + TVA)`),
   * HT en b2b (le prix pro n'est jamais majoré de la TVA à l'affichage —
   * seul le HT remisé compte pour un pro, la TVA n'apparaît que sur la
   * facture/le total encaissé, 11). DOIT toujours être présenté avec le bon
   * suffixe (`Price`, `role`) : un des deux bugs corrigés ici était un
   * montant TTC affiché avec le libellé « HT ».
   */
  unitAmountCents: number;
  /** Montant HT — snapshot stocké sur `order_items.unit_price_ht` (03), base de tout calcul de ligne. */
  unitHtCents: number;
}

/**
 * Résout le HT unitaire pro (14) : `pro_price_ht` s'il est renseigné sur le
 * produit (prix pro spécifique) ; sinon le pourcentage pro global de
 * `store_settings` appliqué à `base_price_ht` (13/26, `lib/store-settings.ts`).
 * Centralisé ici : panier, checkout et affichage en dépendent tous, jamais
 * de duplication de cette règle de repli.
 */
export async function resolveProUnitHtCents(product: CatalogEntry): Promise<number> {
  if (product.pro_price_ht !== null) return product.pro_price_ht;

  const discountBps = await getProDiscountBps();
  return Math.round((product.base_price_ht * (10000 - discountBps)) / 10000);
}

/**
 * Ventile le prix unitaire en HT/affichage pour l'encaissement (10) et le
 * snapshot commande (03). b2c : `base_price_ht` est le HT catalogue, la TVA
 * s'ajoute par-dessus pour obtenir le TTC affiché à un particulier. b2b :
 * le HT pro (résolu ci-dessus) est affiché tel quel, label « HT » — les pros
 * paient aussi la TVA, mais seulement au moment de payer/facturer (11), pas
 * sur le prix affiché en fiche produit.
 */
export async function resolvePriceBreakdown(
  product: CatalogEntry,
  role: PricingRole,
): Promise<PriceBreakdown> {
  const vatRateBps = product.vat_rate;

  if (role === "b2b") {
    const unitHtCents = await resolveProUnitHtCents(product);
    return { unitAmountCents: unitHtCents, unitHtCents };
  }

  const unitHtCents = product.base_price_ht;
  const unitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
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
 * du catalogue (04) : résout le HT unitaire pour CE rôle (14, prix pro
 * spécifique ou pourcentage global) puis applique la même formule que la
 * facture (11). `/api/cart/resolve` et `/api/checkout` appellent tous les
 * deux CETTE fonction — jamais de calcul dupliqué qui pourrait diverger
 * entre panier affiché et montant payé.
 */
export async function computeLineCharge(
  product: CatalogEntry,
  role: PricingRole,
  quantity: number,
  discountBps: number,
): Promise<LineCharge> {
  const { unitHtCents } = await resolvePriceBreakdown(product, role);
  return computeLineChargeFromUnitHt(unitHtCents, quantity, discountBps, product.vat_rate);
}
