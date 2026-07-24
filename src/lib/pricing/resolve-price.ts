import "server-only";

import { fetchLiveProPriceHtCents } from "@/lib/catalog/live-pricing";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { getProDiscountBps } from "@/lib/store-settings";
import { computeLineChargeFromUnitHt, type LineCharge } from "./line-charge";
import type { PricingRole } from "./types";

export { STANDARD_VAT_RATE_BPS, computePublicTtcCents, splitTtcAmount } from "./vat";
/**
 * Ré-exportées depuis `line-charge.ts` (extraction 29b) : ce module pur ne
 * dépend ni de `server-only` ni du catalogue et reste importable côté
 * client (calculateur inline PDP) — `resolve-price.ts`, lui, reste
 * `server-only` pour tout le reste (résolution du HT pro en DB, 14/23).
 */
export { computeLineChargeFromUnitHt, type LineCharge } from "./line-charge";

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
 * Résout le HT unitaire pro (14) : `pro_price_ht` s'il est renseigné sur LA
 * VARIANTE (prix pro spécifique) ; sinon le pourcentage pro global de
 * `store_settings` appliqué à `base_price_ht` de cette même variante (13/26,
 * `lib/store-settings.ts`). Centralisé ici : panier, checkout et affichage
 * en dépendent tous, jamais de duplication de cette règle de repli.
 *
 * `variantId` (jamais `sku`, tranche 2) : depuis `product_variants`, un même
 * `sku` produit peut porter plusieurs variantes à des prix différents — seul
 * l'identifiant de variante désigne un prix pro sans ambiguïté. Lu EN LIVE
 * via `service_role` (23), jamais un champ fusionné publiquement (le
 * privilège de colonne empêche de toute façon la clé anon de le lire).
 */
export async function resolveProUnitHtCents(
  variantId: string,
  fallbackBasePriceHtCents: number,
): Promise<number> {
  const liveProPriceHtCents = await fetchLiveProPriceHtCents(variantId);
  if (liveProPriceHtCents !== null) return liveProPriceHtCents;

  const discountBps = await getProDiscountBps();
  return Math.round((fallbackBasePriceHtCents * (10000 - discountBps)) / 10000);
}

/**
 * Ventile le prix unitaire en HT/affichage pour l'encaissement (10) et le
 * snapshot commande (03). b2c : `base_price_ht` est le HT catalogue, la TVA
 * s'ajoute par-dessus pour obtenir le TTC affiché à un particulier. b2b :
 * le HT pro (résolu ci-dessus) est affiché tel quel, label « HT » — les pros
 * paient aussi la TVA, mais seulement au moment de payer/facturer (11), pas
 * sur le prix affiché en fiche produit.
 *
 * `variantId` optionnel : seuls panier/checkout/`product-price` (tranche 2)
 * résolvent réellement un rôle "b2b" avec une variante identifiée — les
 * autres appelants (`PriceBlock`, buy-box PDP, D5) restent figés en rôle
 * "b2c" et n'atteignent donc jamais la branche qui l'exige.
 */
export async function resolvePriceBreakdown(
  product: CatalogEntry,
  role: PricingRole,
  variantId?: string,
): Promise<PriceBreakdown> {
  const vatRateBps = product.vat_rate;

  if (role === "b2b") {
    if (!variantId) {
      throw new Error("resolvePriceBreakdown : variantId requis pour résoudre un prix pro (b2b)");
    }
    const unitHtCents = await resolveProUnitHtCents(variantId, product.base_price_ht);
    return { unitAmountCents: unitHtCents, unitHtCents };
  }

  const unitHtCents = product.base_price_ht;
  const unitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
  return { unitAmountCents, unitHtCents };
}

/**
 * Point d'entrée unique pour chiffrer une ligne de panier/checkout à partir
 * du catalogue (04) : résout le HT unitaire pour CE rôle (14, prix pro
 * spécifique ou pourcentage global) puis applique la même formule que la
 * facture (11). `/api/cart/resolve` et `/api/checkout` appellent tous les
 * deux CETTE fonction, avec le `variantId` de la ligne (tranche 2) — jamais
 * de calcul dupliqué qui pourrait diverger entre panier affiché et montant
 * payé.
 */
export async function computeLineCharge(
  product: CatalogEntry,
  role: PricingRole,
  quantity: number,
  discountBps: number,
  variantId?: string,
): Promise<LineCharge> {
  const { unitHtCents } = await resolvePriceBreakdown(product, role, variantId);
  return computeLineChargeFromUnitHt(unitHtCents, quantity, discountBps, product.vat_rate);
}
