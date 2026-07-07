import { ACCESSORY_YIELD_RULES } from "@/features/calculator";
import type { CatalogEntry } from "@/lib/catalog/schema";

/**
 * Accessoires « compatibles » avec une membrane pour le cross-sell (09) :
 * mêmes catégories que celles dotées d'un rendement dans le calculateur
 * (08) — feutre, colle, PVC liquide, profils, solvant. Fonction pure, pas
 * de quantité calculée (aucune dimension de bassin connue hors calculateur) :
 * une simple suggestion, jamais un ajout forcé.
 */
export function getCompatibleAccessories(accessories: CatalogEntry[]): CatalogEntry[] {
  return accessories.filter((product) => product.category in ACCESSORY_YIELD_RULES);
}
