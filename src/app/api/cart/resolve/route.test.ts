import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Cohérence financière (10/13/14, tranche 2) : le TTC affiché par
 * `/api/cart/resolve` pour une ligne membrane (m²) et une ligne accessoire
 * (unité) doit être EXACTEMENT celui que `/api/checkout` calculera pour les
 * mêmes lignes — les deux routes appellent `computeLineCharge` avec le MÊME
 * `variantId` résolu depuis le MÊME `getLiveCatalogEntries()`
 * (`src/app/api/checkout/route.test.ts` vérifie les montants Stripe
 * correspondants : 240000 / 5396). Ce test vérifie aussi le garde-fou
 * blind-shipping : aucune fuite de `variantId`/`ref_apf`/`sku` interne dans
 * la réponse panier.
 */

const resolvePricingRole = vi.fn();
const getLiveCatalogEntries = vi.fn();

vi.mock("@/lib/pricing/resolve-role", () => ({
  resolvePricingRole: (...args: unknown[]) => resolvePricingRole(...args),
}));

vi.mock("@/lib/catalog/live-catalog", () => ({
  getLiveCatalogEntries: (...args: unknown[]) => getLiveCatalogEntries(...args),
}));

vi.mock("@/lib/env", () => ({
  getBusinessConfigEnv: () => ({ PACK_DISCOUNT_BPS: 500 }),
}));

import { POST } from "./route";

const VARIANT_MEMBRANE = "11111111-1111-1111-1111-111111111111";
const VARIANT_ACCESSORY = "22222222-2222-2222-2222-222222222222";

const MEMBRANE = {
  entry: {
    slug: "membrane-armee-uni-bleu",
    sku: "APF-MEMB-UNI-BLEU",
    name: "Membrane armée unie bleue",
    image: "/media/placeholders/produit-generique.svg",
    unit: "rouleau",
    category: "MEMBRANE",
    base_price_ht: 100000,
    vat_rate: 2000,
    pro_price_ht: null,
    in_stock: true,
  },
  variantId: VARIANT_MEMBRANE,
};

const ACCESSORY = {
  entry: {
    slug: "colle-pvc-5kg",
    sku: "APF-COLLE-PVC-5KG",
    name: "Colle PVC 5kg",
    image: "/media/placeholders/produit-generique.svg",
    unit: "unite",
    category: "COLLE",
    base_price_ht: 1499,
    vat_rate: 2000,
    pro_price_ht: null,
    in_stock: true,
  },
  variantId: VARIANT_ACCESSORY,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/cart/resolve", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/cart/resolve — cohérence financière + blind shipping (tranche 2)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("le TTC d'une ligne membrane (m²) et d'une ligne accessoire (unité) == le montant que /api/checkout facturera pour ces mêmes lignes", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    getLiveCatalogEntries.mockResolvedValue([MEMBRANE, ACCESSORY]);

    const response = await POST(
      makeRequest({
        lines: [
          { slug: "membrane-armee-uni-bleu", quantity: 2, source: "catalog" },
          { slug: "colle-pvc-5kg", quantity: 3, source: "catalog" },
        ],
        packs: {},
      }),
    );

    const body = await response.json();
    expect(body.lines).toHaveLength(2);

    // Mêmes montants que ceux attendus au checkout pour les lignes identiques
    // (voir src/app/api/checkout/route.test.ts : unit_amount 240000 / 5396).
    expect(body.lines[0].lineTtcCents).toBe(240000);
    expect(body.lines[1].lineTtcCents).toBe(5396);
  });

  it("blind shipping : aucune fuite de variantId/ref_apf/sku interne dans la réponse panier", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    getLiveCatalogEntries.mockResolvedValue([MEMBRANE, ACCESSORY]);

    const response = await POST(
      makeRequest({
        lines: [{ slug: "membrane-armee-uni-bleu", quantity: 1, source: "catalog" }],
        packs: {},
      }),
    );

    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/APF/i);
    expect(JSON.stringify(body)).not.toMatch(new RegExp(VARIANT_MEMBRANE, "i"));
  });

  it("un slug introuvable dans le catalogue live produit une ligne indisponible, jamais une erreur", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    getLiveCatalogEntries.mockResolvedValue([MEMBRANE]);

    const response = await POST(
      makeRequest({
        lines: [{ slug: "slug-inexistant", quantity: 1, source: "catalog" }],
        packs: {},
      }),
    );

    const body = await response.json();
    expect(body.lines[0].available).toBe(false);
  });
});
