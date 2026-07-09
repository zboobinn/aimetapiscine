import { describe, expect, it } from "vitest";

import catalogFile from "../../../data/catalog.json";
import { buildResolvedCartLine, buildUnavailableCartLine } from "./resolved-line";
import { toCartProductSummary } from "./product-summary";
import { toProductRow } from "@/lib/catalog/product-row";
import { catalogFileSchema } from "@/lib/catalog/schema";
import type { LineCharge } from "@/lib/pricing/resolve-price";

/**
 * Garde-fou permanent du blind shipping (01/23) : le SKU catalogue
 * (préfixé `APF-...`, référence fournisseur interne) ne doit JAMAIS
 * apparaître dans un chemin d'image, ni dans une réponse d'API panier, ni
 * dans les props sérialisées transmises à un Client Component. Ce test
 * échoue si l'un de ces trois points régresse.
 */

const APF_PATTERN = /APF/i;

const catalog = catalogFileSchema.parse(catalogFile);
const sampleProduct = catalog.products.find((p) => p.sku.startsWith("APF-"));

if (!sampleProduct) {
  throw new Error("Fixture invalide : aucun produit APF-... dans data/catalog.json pour ce test.");
}

const sampleCharge: LineCharge = {
  unitHtCents: sampleProduct.base_price_ht,
  lineHtBeforeDiscountCents: sampleProduct.base_price_ht,
  discountHtCents: 0,
  lineHtCents: sampleProduct.base_price_ht,
  lineVatCents: 0,
  lineTtcCents: sampleProduct.base_price_ht,
};

describe("blind shipping — sku APF ne doit jamais fuiter côté client", () => {
  it("aucun chemin d'image du catalogue ne contient le préfixe SKU", () => {
    for (const product of catalog.products) {
      expect(product.image).not.toMatch(APF_PATTERN);
    }
  });

  it("la ligne de panier résolue (réponse /api/cart/resolve) ne contient pas le sku", () => {
    const resolved = buildResolvedCartLine(sampleProduct, 1, 0, sampleCharge, undefined);
    expect(JSON.stringify(resolved)).not.toMatch(APF_PATTERN);
    expect(resolved.slug).toBe(sampleProduct.slug);
  });

  it("une ligne de panier introuvable ne contient pas le sku demandé", () => {
    const unavailable = buildUnavailableCartLine(sampleProduct.slug, 1);
    expect(JSON.stringify(unavailable)).not.toMatch(APF_PATTERN);
  });

  it("les props passées à AddToCartButton (RSC) ne contiennent pas le sku", () => {
    const summary = toCartProductSummary(sampleProduct, sampleProduct.base_price_ht);
    expect(JSON.stringify(summary)).not.toMatch(APF_PATTERN);
    expect(summary.slug).toBe(sampleProduct.slug);
  });

  it("une ligne `products` (import catalogue) ne porte la référence fournisseur que sur `sku`", () => {
    for (const product of catalog.products) {
      const row = toProductRow(product);

      for (const [column, value] of Object.entries(row)) {
        if (column === "sku") continue;
        expect(JSON.stringify(value), `colonne "${column}"`).not.toMatch(APF_PATTERN);
      }
    }
  });
});
