import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { attachMembraneProduct, calculatePack } from "./calculate-pack";
import { defaultCalculatorConfig } from "./calculator-config";

const config = defaultCalculatorConfig();

function accessory(overrides: Partial<CatalogEntry>): CatalogEntry {
  return {
    sku: "TEST-SKU",
    slug: "test-slug",
    name: "Produit de test",
    category: "FEUTRE",
    base_price_ht: 1000,
    pro_price_ht: 900,
    vat_rate: 2000,
    weight_grams: 1000,
    roll_area_m2: null,
    unit: "rouleau",
    coverage: { m2_per_unit: 50 },
    image: "/products/test.jpg",
    in_stock: true,
    ...overrides,
  };
}

describe("calculatePack", () => {
  it("assemble surface, rouleaux et accessoires pour un bassin sans escalier", () => {
    const result = calculatePack({
      input: {
        pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "aucun",
      },
      config,
      membraneRollAreaM2: 41.25,
      accessoryProducts: [accessory({})],
    });

    expect(result.surface.grossM2).toBeCloseTo(78.2, 5);
    expect(result.membrane.quantity).toBe(2);
    expect(result.membrane.unit).toBe("rouleau");
    expect(result.membrane.motif).toContain("78.2 m²");
    expect(result.accessories).toHaveLength(1);
    expect(result.accessories[0].quantity).toBe(2);
  });

  it("augmente les quantités avec un escalier", () => {
    const sansEscalier = calculatePack({
      input: {
        pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "aucun",
      },
      config,
      membraneRollAreaM2: 41.25,
      accessoryProducts: [],
    });

    const avecEscalier = calculatePack({
      input: {
        pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "roman",
      },
      config,
      membraneRollAreaM2: 41.25,
      accessoryProducts: [],
    });

    expect(avecEscalier.surface.grossM2).toBeGreaterThan(sansEscalier.surface.grossM2);
  });
});

describe("attachMembraneProduct", () => {
  it("greffe le SKU choisi à l'étape résultat sur la ligne membrane calculée", () => {
    const result = calculatePack({
      input: {
        pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "aucun",
      },
      config,
      membraneRollAreaM2: 41.25,
      accessoryProducts: [],
    });

    const membraneProduct = accessory({
      sku: "APF-MEMB-UNI-BLEU",
      slug: "membrane-armee-uni-bleu",
      name: "Membrane armée unie bleue",
      category: "MEMBRANE",
      unit: "rouleau",
      coverage: null,
      roll_area_m2: 41.25,
    });

    const line = attachMembraneProduct(result.membrane, membraneProduct);

    expect(line.sku).toBe("APF-MEMB-UNI-BLEU");
    expect(line.quantity).toBe(result.membrane.quantity);
    expect(line.motif).toBe(result.membrane.motif);
  });
});
