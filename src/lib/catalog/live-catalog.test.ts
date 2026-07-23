import { describe, expect, it } from "vitest";

import {
  CATALOG_SELECT_COLUMNS,
  minActiveVariantPriceCents,
  pickPdpVariant,
  shapeLiveProduct,
  toCatalogEntry,
  type LiveProduct,
} from "./live-catalog";

/**
 * `shapeLiveProduct` porte, en plus des filtres `.eq()` côté requête
 * Supabase, la défense en profondeur "produit brouillon/désactivé ou sans
 * variante active non servi" — ces tests l'exercent directement, sans base
 * réelle (même approche que `resolve-price.test.ts` pour la chaîne de prix).
 */

function makeRow(overrides: Partial<Parameters<typeof shapeLiveProduct>[0]> = {}) {
  return {
    id: "prod-1",
    sku: "AP-MEMBRANE-TEST",
    name: "Membrane armée test",
    slug: "membrane-test",
    category: "MEMBRANE" as const,
    description: null,
    image_url: null,
    vat_rate: 2000,
    statut: "publie" as const,
    is_active: true,
    product_variants: [
      {
        id: "var-1",
        coloris: "BLEU CLAIR",
        largeur_m: 1.65,
        longueur_rouleau_m: 25,
        roll_area_m2: 41.25,
        base_price_ht: 2700,
        weight_grams: 0,
        coverage: null,
        in_stock: true,
        is_active: true,
      },
      {
        id: "var-2",
        coloris: "SABLE",
        largeur_m: 1.65,
        longueur_rouleau_m: 25,
        roll_area_m2: 41.25,
        base_price_ht: 3200,
        weight_grams: 0,
        coverage: null,
        in_stock: true,
        is_active: true,
      },
    ],
    ...overrides,
  };
}

describe("CATALOG_SELECT_COLUMNS — étanchéité de la lecture publique (23/27)", () => {
  it("ne demande jamais ref_apf ni pro_price_ht", () => {
    expect(CATALOG_SELECT_COLUMNS).not.toMatch(/ref_apf/);
    expect(CATALOG_SELECT_COLUMNS).not.toMatch(/pro_price_ht/);
  });

  it("n'utilise jamais select(\"*\")", () => {
    expect(CATALOG_SELECT_COLUMNS.trim()).not.toBe("*");
  });
});

describe("shapeLiveProduct — visibilité publie/is_active en cascade (03)", () => {
  it("un produit publié avec des variantes actives est servi, sans ref_apf/pro_price_ht dans la forme obtenue", () => {
    const product = shapeLiveProduct(makeRow());
    expect(product).not.toBeNull();
    expect(JSON.stringify(product)).not.toMatch(/ref_apf|pro_price_ht/i);
  });

  it("un produit brouillon n'est jamais servi", () => {
    const product = shapeLiveProduct(makeRow({ statut: "brouillon" }));
    expect(product).toBeNull();
  });

  it("un produit is_active=false n'est jamais servi", () => {
    const product = shapeLiveProduct(makeRow({ is_active: false }));
    expect(product).toBeNull();
  });

  it("une variante is_active=false est exclue, les autres restent", () => {
    const row = makeRow();
    row.product_variants[0].is_active = false;
    const product = shapeLiveProduct(row);
    expect(product?.variants).toHaveLength(1);
    expect(product?.variants[0].id).toBe("var-2");
  });

  it("un produit dont TOUTES les variantes sont désactivées n'est pas servi", () => {
    const row = makeRow();
    row.product_variants.forEach((v) => (v.is_active = false));
    expect(shapeLiveProduct(row)).toBeNull();
  });

  it("un coloris contenant un token denylist est remplacé par un repli, jamais exposé (27, tokens de test tests/setup.ts)", () => {
    const row = makeRow();
    row.product_variants[0].coloris = "BLEU ZOLVEX";
    const product = shapeLiveProduct(row);
    expect(product?.variants[0].coloris?.toLowerCase()).not.toContain("zolvex");
  });

  it("un nom produit contenant un token denylist est remplacé, jamais exposé", () => {
    const row = makeRow({ name: "Membrane Brumanor Premium" });
    const product = shapeLiveProduct(row);
    expect(product?.name.toLowerCase()).not.toContain("brumanor");
  });
});

describe("minActiveVariantPriceCents — prix « à partir de » (D19)", () => {
  it("retourne le MIN des variantes actives", () => {
    const product = shapeLiveProduct(makeRow()) as LiveProduct;
    expect(minActiveVariantPriceCents(product)).toBe(2700);
  });

  it("ignore une variante moins chère mais désactivée", () => {
    const row = makeRow();
    row.product_variants.push({
      id: "var-3",
      coloris: "GRIS",
      largeur_m: 1.65,
      longueur_rouleau_m: 25,
      roll_area_m2: 41.25,
      base_price_ht: 100,
      weight_grams: 0,
      coverage: null,
      in_stock: true,
      is_active: false,
    });
    const product = shapeLiveProduct(row) as LiveProduct;
    // La variante à 100 centimes est désactivée : elle n'entre jamais dans le shape ni dans le calcul.
    expect(product.variants.some((v) => v.basePriceHtCents === 100)).toBe(false);
    expect(minActiveVariantPriceCents(product)).toBe(2700);
  });
});

describe("pickPdpVariant", () => {
  it("sélectionne la variante dont le coloris slugifié correspond", () => {
    const product = shapeLiveProduct(makeRow()) as LiveProduct;
    const variant = pickPdpVariant(product, "sable");
    expect(variant?.id).toBe("var-2");
  });

  it("sans coloris demandé, retourne la variante la moins chère (accessoires, pas de sélecteur)", () => {
    const product = shapeLiveProduct(makeRow()) as LiveProduct;
    const variant = pickPdpVariant(product);
    expect(variant?.id).toBe("var-1");
  });
});

describe("toCatalogEntry — jamais de pro_price_ht, rôle b2c uniquement", () => {
  it("pro_price_ht est toujours null, quel que soit le produit source", () => {
    const product = shapeLiveProduct(makeRow()) as LiveProduct;
    const entry = toCatalogEntry(product, product.variants[0], {
      gammeSlug: "membrane-test",
      couleurSlug: "bleu-clair",
    });
    expect(entry.pro_price_ht).toBeNull();
    expect(JSON.stringify(entry)).not.toMatch(/ref_apf/i);
  });
});
