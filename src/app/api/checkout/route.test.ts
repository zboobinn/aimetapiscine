import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Blind shipping (23/27) + cohérence financière (10/13/14, tranche 2) sur
 * `/api/checkout` : la ligne Stripe ne doit transporter QUE `variant_id`
 * (UUID maison) en métadonnée — jamais `ref_apf`, jamais `sku` — et le
 * montant facturé (`unit_amount`) doit être EXACTEMENT celui que
 * `/api/cart/resolve` afficherait pour les mêmes lignes (même fonction
 * `computeLineCharge`, même `variantId`).
 */

const resolvePricingRole = vi.fn();
const getLiveCatalogEntries = vi.fn();
const checkCheckoutRateLimit = vi.fn();
const getUser = vi.fn();
const sessionsCreate = vi.fn();

vi.mock("@/lib/pricing/resolve-role", () => ({
  resolvePricingRole: (...args: unknown[]) => resolvePricingRole(...args),
}));

vi.mock("@/lib/catalog/live-catalog", () => ({
  getLiveCatalogEntries: (...args: unknown[]) => getLiveCatalogEntries(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkCheckoutRateLimit: (...args: unknown[]) => checkCheckoutRateLimit(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: (...args: unknown[]) => sessionsCreate(...args) } } }),
}));

vi.mock("@/lib/env", () => ({
  getBusinessConfigEnv: () => ({ PACK_DISCOUNT_BPS: 500 }),
  getSiteEnv: () => ({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
}));

import { POST } from "./route";

const VARIANT_MEMBRANE = "11111111-1111-1111-1111-111111111111";
const VARIANT_ACCESSORY = "22222222-2222-2222-2222-222222222222";

const MEMBRANE = {
  entry: {
    slug: "membrane-armee-uni-bleu",
    sku: "APF-MEMB-UNI-BLEU",
    name: "Membrane armée unie bleue",
    base_price_ht: 100000,
    vat_rate: 2000,
    pro_price_ht: null,
    in_stock: true,
    unit: "rouleau",
  },
  variantId: VARIANT_MEMBRANE,
};

const ACCESSORY = {
  entry: {
    slug: "colle-pvc-5kg",
    sku: "APF-COLLE-PVC-5KG",
    name: "Colle PVC 5kg",
    base_price_ht: 1499,
    vat_rate: 2000,
    pro_price_ht: null,
    in_stock: true,
    unit: "unite",
  },
  variantId: VARIANT_ACCESSORY,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/checkout — blind shipping + cohérence financière (tranche 2)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ligne membrane (m²) ET ligne accessoire (unité) : la metadata Stripe ne porte que variant_id, jamais ref_apf/sku", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    getLiveCatalogEntries.mockResolvedValue([MEMBRANE, ACCESSORY]);
    checkCheckoutRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    getUser.mockResolvedValue({ data: { user: null } });
    sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session-1" });

    const response = await POST(
      makeRequest({
        lines: [
          { slug: "membrane-armee-uni-bleu", quantity: 2, source: "catalog" },
          { slug: "colle-pvc-5kg", quantity: 3, source: "catalog" },
        ],
        packs: {},
      }),
    );

    expect(response.status).toBe(200);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);

    const { line_items: lineItems } = sessionsCreate.mock.calls[0][0];
    expect(lineItems).toHaveLength(2);

    for (const lineItem of lineItems) {
      const metadata = lineItem.price_data.product_data.metadata;
      expect(metadata).toHaveProperty("variant_id");
      expect(Object.keys(metadata)).not.toContain("sku");
      expect(JSON.stringify(metadata)).not.toMatch(/APF/i);
    }

    expect(lineItems[0].price_data.product_data.metadata.variant_id).toBe(VARIANT_MEMBRANE);
    expect(lineItems[1].price_data.product_data.metadata.variant_id).toBe(VARIANT_ACCESSORY);

    // Ligne membrane : 100000 HT × 2 = 200000, TVA 20 % = 240000 TTC.
    expect(lineItems[0].price_data.unit_amount).toBe(240000);
    // Ligne accessoire : 1499 HT × 3 = 4497, TVA 20 % arrondie = 5396 TTC (round(899.4)=899).
    expect(lineItems[1].price_data.unit_amount).toBe(5396);
  });

  it("un slug hors catalogue ou hors stock rend le panier indisponible, jamais de session Stripe créée", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    getLiveCatalogEntries.mockResolvedValue([MEMBRANE]);
    checkCheckoutRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(
      makeRequest({ lines: [{ slug: "slug-inexistant", quantity: 1, source: "catalog" }], packs: {} }),
    );

    expect(response.status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});
