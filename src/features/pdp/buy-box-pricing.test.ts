import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "@/lib/catalog/schema";

const resolvePriceBreakdown = vi.fn();

vi.mock("@/lib/pricing/resolve-price", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pricing/resolve-price")>();
  return { ...actual, resolvePriceBreakdown: (...args: unknown[]) => resolvePriceBreakdown(...args) };
});

vi.mock("@/lib/env", () => ({
  getBusinessConfigEnv: () => ({
    SHIPPING_MODE: "flat",
    SHIPPING_FLAT_FEE_CENTS: 4000,
    SHIPPING_CORSICA_SURCHARGE_CENTS: 3000,
  }),
}));

import { computePdpBuyBoxAmounts } from "./buy-box-pricing";

const PRODUCT = {
  slug: "membrane-bleu",
  vat_rate: 2000,
  roll_area_m2: 41.25,
} as unknown as CatalogEntry;

describe("computePdpBuyBoxAmounts", () => {
  afterEach(() => {
    resolvePriceBreakdown.mockReset();
  });

  it("les 4 valeurs de la buy-box bougent ensemble quand la fonction de prix canonique change — aucune valeur dérivée d'un chemin parallèle", async () => {
    resolvePriceBreakdown.mockResolvedValue({ unitAmountCents: 3000, unitHtCents: 2500 });
    const first = await computePdpBuyBoxAmounts(PRODUCT, "b2c", 2, 46.4);

    resolvePriceBreakdown.mockResolvedValue({ unitAmountCents: 6000, unitHtCents: 5000 });
    const second = await computePdpBuyBoxAmounts(PRODUCT, "b2c", 2, 46.4);

    expect(second.unitAmountCents).toBeGreaterThan(first.unitAmountCents);
    expect(second.membraneSubtotalCents).toBeGreaterThan(first.membraneSubtotalCents);
    expect(second.pricePerM2Cents).toBeGreaterThan(first.pricePerM2Cents!);
    // Livraison indépendante du prix (12) — le total la répercute quand même.
    expect(second.shippingCents).toBe(first.shippingCents);
    expect(second.totalCents).toBeGreaterThan(first.totalCents);
    expect(second.totalCents).toBe(second.membraneSubtotalCents + second.shippingCents);
  });

  it("le total est toujours sous-total membrane + livraison, jamais un recalcul parallèle", async () => {
    resolvePriceBreakdown.mockResolvedValue({ unitAmountCents: 3000, unitHtCents: 2500 });
    const amounts = await computePdpBuyBoxAmounts(PRODUCT, "b2c", 2, 46.4);

    expect(amounts.totalCents).toBe(amounts.membraneSubtotalCents + amounts.shippingCents);
  });

  it("€/m² sur surface couverte (choix A) : Surface × Prix/m² revient au sous-total membrane, à l'euro près", async () => {
    resolvePriceBreakdown.mockResolvedValue({ unitAmountCents: 3000, unitHtCents: 2500 });
    const coveredAreaM2 = 46.4;
    const amounts = await computePdpBuyBoxAmounts(PRODUCT, "b2c", 30, coveredAreaM2);

    expect(amounts.pricePerM2Cents).not.toBeNull();
    const reconstitutedEuros = Math.round((amounts.pricePerM2Cents! * coveredAreaM2) / 100);
    expect(reconstitutedEuros).toBe(Math.round(amounts.membraneSubtotalCents / 100));
  });
});
