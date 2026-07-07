import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { computeAccessoryLineItems } from "./accessories";
import { defaultCalculatorConfig } from "./calculator-config";
import { computeSurfaceBreakdown } from "./geometry";

const config = defaultCalculatorConfig();

const surface = computeSurfaceBreakdown(
  { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
  "aucun",
  config,
);
// surface.grossM2 = 78.2, surface.perimeterM = 24

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

describe("computeAccessoryLineItems", () => {
  it("calcule un feutre proportionnel à la surface brute", () => {
    const [line] = computeAccessoryLineItems(surface, [accessory({})], config);

    expect(line.quantity).toBe(Math.ceil(78.2 / 50));
    expect(line.motif).toContain("78.2 m²");
  });

  it("calcule une colle proportionnelle à la surface brute (m2_per_unit)", () => {
    const [line] = computeAccessoryLineItems(
      surface,
      [accessory({ category: "COLLE", coverage: { m2_per_unit: 16.6 } })],
      config,
    );

    expect(line.quantity).toBe(Math.ceil(78.2 / 16.6));
  });

  it("calcule un PVC liquide proportionnel au périmètre (ml_per_unit)", () => {
    const [line] = computeAccessoryLineItems(
      surface,
      [accessory({ category: "PVC_LIQUIDE", coverage: { ml_per_unit: 100 } })],
      config,
    );

    expect(line.quantity).toBe(Math.ceil(24 / 100));
    expect(line.motif).toContain("24 ml");
  });

  it("calcule des profils proportionnels au périmètre (ml_per_barre)", () => {
    const [line] = computeAccessoryLineItems(
      surface,
      [accessory({ category: "PROFIL", coverage: { ml_per_barre: 2 } })],
      config,
    );

    expect(line.quantity).toBe(Math.ceil(24 / 2));
  });

  it("arrondit toujours à l'unité vendable supérieure", () => {
    const [line] = computeAccessoryLineItems(
      surface,
      [accessory({ coverage: { m2_per_unit: 40 } })],
      config,
    );

    // 78.2 / 40 = 1.955 -> 2, jamais 1.955
    expect(line.quantity).toBe(2);
  });

  it("ignore les produits sans règle pour leur catégorie (ex. AUTRE)", () => {
    const lines = computeAccessoryLineItems(
      surface,
      [accessory({ category: "AUTRE", coverage: { m2_per_unit: 10 } })],
      config,
    );

    expect(lines).toHaveLength(0);
  });

  it("ignore un produit sans coverage ou sans la clé attendue", () => {
    const lines = computeAccessoryLineItems(
      surface,
      [accessory({ coverage: null }), accessory({ coverage: { autre_cle: 10 } })],
      config,
    );

    expect(lines).toHaveLength(0);
  });
});
