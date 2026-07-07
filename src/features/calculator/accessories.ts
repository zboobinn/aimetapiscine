import type { CatalogEntry } from "@/lib/catalog/schema";
import type { AccessoryDemandBasis, AccessoryYieldRule, CalculatorConfig } from "./calculator-config";
import type { CalculatorLineItem, SurfaceBreakdown } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function demandFor(basis: AccessoryDemandBasis, surface: SurfaceBreakdown): number {
  return basis === "surface" ? surface.grossM2 : surface.perimeterM;
}

function motifFor(rule: AccessoryYieldRule, demand: number): string {
  return rule.demandBasis === "surface"
    ? `Pour ${round2(demand)} m² de membrane posée`
    : `Pour ${round2(demand)} ml de périmètre / soudure`;
}

/**
 * Quantités d'accessoires proportionnelles à la surface/au périmètre du
 * pack, lues depuis `coverage` du catalogue (04) via les règles de
 * `calculator-config.ts` — aucun rendement codé en dur ici. Les produits
 * sans règle de catégorie ou sans la clé `coverage` attendue sont ignorés
 * (ex. `AUTRE`) plutôt que de faire échouer tout le calcul.
 */
export function computeAccessoryLineItems(
  surface: SurfaceBreakdown,
  accessoryProducts: CatalogEntry[],
  config: CalculatorConfig,
): CalculatorLineItem[] {
  const lines: CalculatorLineItem[] = [];

  for (const product of accessoryProducts) {
    const rule = config.accessoryYield[product.category];
    if (!rule || !product.coverage) continue;

    const yieldPerUnit = product.coverage[rule.coverageKey];
    if (!yieldPerUnit) continue;

    const demand = demandFor(rule.demandBasis, surface);
    // Arrondi supérieur à l'unité vendable (08) : jamais de rouleau/bidon fractionné.
    const quantity = Math.ceil(demand / yieldPerUnit);

    lines.push({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      quantity,
      unit: product.unit,
      motif: motifFor(rule, demand),
    });
  }

  return lines;
}
