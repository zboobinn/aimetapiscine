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
