import { afterEach, describe, expect, it, vi } from "vitest";

const resolvePricingRole = vi.fn();
const withLivePricingOne = vi.fn();
const withLivePricing = vi.fn();
const fetchLiveProPriceHtCents = vi.fn();
const getProDiscountBps = vi.fn();

vi.mock("@/lib/pricing/resolve-role", () => ({
  resolvePricingRole: (...args: unknown[]) => resolvePricingRole(...args),
}));

vi.mock("@/lib/catalog/live-pricing", () => ({
  withLivePricingOne: (...args: unknown[]) => withLivePricingOne(...args),
  withLivePricing: (...args: unknown[]) => withLivePricing(...args),
  fetchLiveProPriceHtCents: (...args: unknown[]) => fetchLiveProPriceHtCents(...args),
}));

vi.mock("@/lib/store-settings", () => ({
  getProDiscountBps: (...args: unknown[]) => getProDiscountBps(...args),
}));

const MEMBRANE = {
  slug: "membrane-armee-uni-bleu",
  sku: "APF-MEMB-UNI-BLEU",
  base_price_ht: 100000,
  vat_rate: 2000,
  pro_price_ht: null,
  in_stock: true,
};

const COLLE = {
  slug: "colle-pvc-5kg",
  sku: "APF-COLLE-PVC-5KG",
  base_price_ht: 1499,
  vat_rate: 2000,
  pro_price_ht: null,
  in_stock: true,
};

const PROFILE = {
  slug: "profile-finition",
  sku: "APF-PROFILE-FINITION",
  base_price_ht: 890,
  vat_rate: 2000,
  pro_price_ht: null,
  in_stock: true,
};

vi.mock("@/lib/catalog/data", () => ({
  getAllProducts: () => [MEMBRANE, COLLE, PROFILE],
}));

import { GET } from "./route";

function makeRequest(slug: string, accessorySlugs?: string) {
  const params = new URLSearchParams({ slug });
  if (accessorySlugs) params.set("accessorySlugs", accessorySlugs);
  return new Request(`http://localhost/api/pricing/product-price?${params.toString()}`);
}

describe("GET /api/pricing/product-price — étanchéité du prix pro (règle sacrée)", () => {
  afterEach(() => {
    resolvePricingRole.mockReset();
    withLivePricingOne.mockReset();
    withLivePricing.mockReset();
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

  it("b2c AVEC accessorySlugs demandés : la garde reste intacte — aucune donnée accessoire, aucun appel pro déclenché (29c② partie A)", async () => {
    resolvePricingRole.mockResolvedValue("b2c");
    withLivePricingOne.mockImplementation(async (entry) => entry);

    const response = await GET(makeRequest("membrane-armee-uni-bleu", "colle-pvc-5kg,profile-finition"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["publicTtcCents", "role"]);
    for (const key of Object.keys(body)) {
      expect(key.toLowerCase()).not.toMatch(/ht|pro/);
    }

    // Un b2c ne déclenche AUCUNE résolution de prix pro, ni pour la membrane
    // ni pour les accessoires — le batch de lecture live n'est même pas appelé.
    expect(withLivePricing).not.toHaveBeenCalled();
    expect(fetchLiveProPriceHtCents).not.toHaveBeenCalled();
    expect(getProDiscountBps).not.toHaveBeenCalled();
  });

  it("b2b vérifié : la réponse contient le prix public, le prix pro ET le HT pro (29b③)", async () => {
    resolvePricingRole.mockResolvedValue("b2b");
    withLivePricingOne.mockImplementation(async (entry) => entry);
    withLivePricing.mockImplementation(async (entries) => entries);
    fetchLiveProPriceHtCents.mockResolvedValue(null);
    getProDiscountBps.mockResolvedValue(1000); // -10 %

    const response = await GET(makeRequest("membrane-armee-uni-bleu"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual([
      "accessoryProPricing",
      "proUnitAmountCents",
      "proUnitHtCents",
      "publicTtcCents",
      "role",
    ]);
    expect(body.role).toBe("b2b");
    expect(body.publicTtcCents).toBe(120000);
    expect(body.proUnitAmountCents).toBe(90000); // 100000 HT × 90 %
    expect(body.proUnitHtCents).toBe(90000); // b2b : unitAmountCents === unitHtCents (jamais majoré de TVA à l'affichage)
    // Aucun accessoire demandé : le sac reste vide, pas d'appel superflu.
    expect(body.accessoryProPricing).toEqual({});
  });

  it("b2b vérifié + accessorySlugs (29c② partie A, correctif « PDP ≠ panier ») : le HT pro de CHAQUE accessoire coché est résolu dans le MÊME aller-retour, via la MÊME fonction que la membrane", async () => {
    resolvePricingRole.mockResolvedValue("b2b");
    withLivePricingOne.mockImplementation(async (entry) => entry);
    withLivePricing.mockImplementation(async (entries) => entries);
    fetchLiveProPriceHtCents.mockResolvedValue(null);
    getProDiscountBps.mockResolvedValue(1000); // -10 % pour toutes les lignes (même réglage global)

    const response = await GET(makeRequest("membrane-armee-uni-bleu", "colle-pvc-5kg,profile-finition"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual([
      "accessoryProPricing",
      "proUnitAmountCents",
      "proUnitHtCents",
      "publicTtcCents",
      "role",
    ]);

    expect(body.accessoryProPricing).toEqual({
      "colle-pvc-5kg": { proUnitHtCents: 1349, proUnitAmountCents: 1349 }, // 1499 × 90 %
      "profile-finition": { proUnitHtCents: 801, proUnitAmountCents: 801 }, // 890 × 90 %, arrondi
    });

    // Résolu en UN SEUL batch de lecture live (pas un appel par accessoire).
    expect(withLivePricing).toHaveBeenCalledTimes(1);
  });

  it("b2b + accessorySlugs contenant un slug inconnu du catalogue : ignoré silencieusement, jamais d'erreur ni de clé fantôme", async () => {
    resolvePricingRole.mockResolvedValue("b2b");
    withLivePricingOne.mockImplementation(async (entry) => entry);
    withLivePricing.mockImplementation(async (entries) => entries);
    fetchLiveProPriceHtCents.mockResolvedValue(null);
    getProDiscountBps.mockResolvedValue(1000);

    const response = await GET(makeRequest("membrane-armee-uni-bleu", "colle-pvc-5kg,slug-inexistant"));
    const body = await response.json();

    expect(Object.keys(body.accessoryProPricing)).toEqual(["colle-pvc-5kg"]);
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
