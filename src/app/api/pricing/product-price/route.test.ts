import { afterEach, describe, expect, it, vi } from "vitest";

const resolvePricingRole = vi.fn();
const withLivePricingOne = vi.fn();
const fetchLiveProPriceHtCents = vi.fn();
const getProDiscountBps = vi.fn();

vi.mock("@/lib/pricing/resolve-role", () => ({
  resolvePricingRole: (...args: unknown[]) => resolvePricingRole(...args),
}));

vi.mock("@/lib/catalog/live-pricing", () => ({
  withLivePricingOne: (...args: unknown[]) => withLivePricingOne(...args),
  fetchLiveProPriceHtCents: (...args: unknown[]) => fetchLiveProPriceHtCents(...args),
}));

vi.mock("@/lib/store-settings", () => ({
  getProDiscountBps: (...args: unknown[]) => getProDiscountBps(...args),
}));

vi.mock("@/lib/catalog/data", () => ({
  getAllProducts: () => [
    {
      slug: "membrane-armee-uni-bleu",
      sku: "APF-MEMB-UNI-BLEU",
      base_price_ht: 100000,
      vat_rate: 2000,
      pro_price_ht: null,
      in_stock: true,
    },
  ],
}));

import { GET } from "./route";

function makeRequest(slug: string) {
  return new Request(`http://localhost/api/pricing/product-price?slug=${encodeURIComponent(slug)}`);
}

describe("GET /api/pricing/product-price — étanchéité du prix pro (règle sacrée)", () => {
  afterEach(() => {
    resolvePricingRole.mockReset();
    withLivePricingOne.mockReset();
    fetchLiveProPriceHtCents.mockReset();
    getProDiscountBps.mockReset();
  });

  it("b2c : la réponse ne contient AUCUNE clé exposant un montant HT ou pro", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    withLivePricingOne.mockImplementation(async (entry) => entry);

    const response = await GET(makeRequest("membrane-armee-uni-bleu"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["publicTtcCents", "role"]);
    expect(body.role).toBe("b2c");
    expect(body.publicTtcCents).toBe(120000);

    // Aucune clé de la réponse ne doit, même par un nom voisin, exposer un HT/pro.
    for (const key of Object.keys(body)) {
      expect(key.toLowerCase()).not.toMatch(/ht|pro/);
    }

    // resolveProUnitHtCents ne doit même pas être invoqué pour un b2c.
    expect(fetchLiveProPriceHtCents).not.toHaveBeenCalled();
    expect(getProDiscountBps).not.toHaveBeenCalled();
  });

  it("b2b vérifié : la réponse contient le prix public, le prix pro ET le HT pro (29b③)", async () => {
    resolvePricingRole.mockResolvedValue("b2b");
    withLivePricingOne.mockImplementation(async (entry) => entry);
    fetchLiveProPriceHtCents.mockResolvedValue(null);
    getProDiscountBps.mockResolvedValue(1000); // -10 %

    const response = await GET(makeRequest("membrane-armee-uni-bleu"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual([
      "proUnitAmountCents",
      "proUnitHtCents",
      "publicTtcCents",
      "role",
    ]);
    expect(body.role).toBe("b2b");
    expect(body.publicTtcCents).toBe(120000);
    expect(body.proUnitAmountCents).toBe(90000); // 100000 HT × 90 %
    expect(body.proUnitHtCents).toBe(90000); // b2b : unitAmountCents === unitHtCents (jamais majoré de TVA à l'affichage)
  });

  it("le rôle vient de resolvePricingRole() (session serveur), jamais d'un paramètre client", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    withLivePricingOne.mockImplementation(async (entry) => entry);

    // Un éventuel paramètre `role` dans l'URL est ignoré : le rôle n'est
    // jamais lu depuis la requête client (CLAUDE.md §Conventions API).
    const response = await GET(
      new Request(
        "http://localhost/api/pricing/product-price?slug=membrane-armee-uni-bleu&role=b2b",
      ),
    );
    const body = await response.json();

    expect(body.role).toBe("b2c");
    expect(body).not.toHaveProperty("proUnitAmountCents");
  });
});
