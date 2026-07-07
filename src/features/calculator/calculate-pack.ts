import type { CatalogEntry } from "@/lib/catalog/schema";
import { computeAccessoryLineItems } from "./accessories";
import type { CalculatorConfig } from "./calculator-config";
import { computeSurfaceBreakdown } from "./geometry";
import { computeRollCount } from "./rolls";
import type { CalculatorInput, CalculatorLineItem, CalculatorResult, MembraneLine } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CalculatePackParams {
  input: CalculatorInput;
  config: CalculatorConfig;
  /** `roll_area_m2` du produit membrane (04) — jamais codé en dur. */
  membraneRollAreaM2: number;
  /** Produits catalogue hors membrane, filtrés par l'appelant (04). */
  accessoryProducts: CatalogEntry[];
}

/**
 * Orchestre le calcul du « Pack Prêt à Poser » (08) à partir de fonctions
 * pures uniquement : aucun accès réseau/DB ici. Le gamme/couleur de
 * membrane n'est PAS résolu par cette fonction — les quantités sont
 * indépendantes du choix esthétique (08) ; `attachMembraneProduct` permet
 * d'y greffer un SKU une fois choisi à l'étape résultat.
 */
export function calculatePack({
  input,
  config,
  membraneRollAreaM2,
  accessoryProducts,
}: CalculatePackParams): CalculatorResult {
  const surface = computeSurfaceBreakdown(input.pool, input.stairType, config);
  const rollCount = computeRollCount(surface.grossM2, membraneRollAreaM2);
  const accessories = computeAccessoryLineItems(surface, accessoryProducts, config);

  const membrane: MembraneLine = {
    quantity: rollCount,
    unit: "rouleau",
    rollAreaM2: membraneRollAreaM2,
    motif: `Pour ${round2(surface.grossM2)} m² de surface brute (coefficient de perte inclus)`,
  };

  return { surface, membrane, accessories };
}

/** Associe un SKU membrane (choisi à l'étape résultat, 08) à la ligne calculée. */
export function attachMembraneProduct(
  membrane: MembraneLine,
  product: CatalogEntry,
): CalculatorLineItem {
  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    quantity: membrane.quantity,
    unit: product.unit,
    motif: membrane.motif,
  };
}
