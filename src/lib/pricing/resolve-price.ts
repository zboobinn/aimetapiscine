import type { CatalogEntry } from "@/lib/catalog/schema";
import type { PricingRole } from "./types";

/**
 * Montant en centimes affiché pour ce rôle (05, Price) : `base_price_ht`
 * pour le public (TTC, cf. usage existant sur les fiches produit) ou
 * `pro_price_ht` pour PRO_VERIFIED (HT). Fonction pure : le calcul de la
 * remise pack (-5 %, 13) et la validation au checkout (10) restent en
 * dehors de cette fonction.
 */
export function resolveUnitPriceCents(product: CatalogEntry, role: PricingRole): number {
  return role === "b2b" ? product.pro_price_ht : product.base_price_ht;
}

export interface PriceBreakdown {
  /** Montant réellement encaissé (10) : TTC dans les deux rôles. */
  unitAmountCents: number;
  /** Montant HT — snapshot stocké sur `order_items.unit_price_ht` (03). */
  unitHtCents: number;
}

/**
 * Ventile le prix unitaire en HT/TTC pour l'encaissement (10) et le snapshot
 * commande (03). b2c : `base_price_ht` est déjà le TTC affiché (cf.
 * `resolveUnitPriceCents`) — le HT s'en déduit. b2b : `pro_price_ht` est le
 * HT — la TVA s'ajoute par-dessus, les pros la payant aussi (13).
 */
export function resolvePriceBreakdown(product: CatalogEntry, role: PricingRole): PriceBreakdown {
  const vatRateBps = product.vat_rate;

  if (role === "b2b") {
    const unitHtCents = product.pro_price_ht;
    const unitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
    return { unitAmountCents, unitHtCents };
  }

  const unitAmountCents = product.base_price_ht;
  const unitHtCents = Math.round((unitAmountCents * 10000) / (10000 + vatRateBps));
  return { unitAmountCents, unitHtCents };
}
