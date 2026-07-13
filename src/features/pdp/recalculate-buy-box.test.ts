import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { DEFAULT_CALCULATOR_INPUT, defaultCalculatorConfig } from "@/features/calculator";
import { STANDARD_VAT_RATE_BPS } from "@/lib/pricing/vat";

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
import { recalculatePdpBuyBoxAmounts } from "./recalculate-buy-box";

const PRODUCT = {
  slug: "membrane-bleu",
  vat_rate: STANDARD_VAT_RATE_BPS,
  roll_area_m2: 41.25,
} as unknown as CatalogEntry;

const config = defaultCalculatorConfig();

describe("recalculatePdpBuyBoxAmounts", () => {
  afterEach(() => {
    resolvePriceBreakdown.mockReset();
  });

  it("produit, sur les cotes par défaut, EXACTEMENT les mêmes 4 valeurs que la chaîne serveur (computePdpBuyBoxAmounts) — preuve d'une source unique", async () => {
    const unitHtCents = 2500;
    resolvePriceBreakdown.mockResolvedValue({
      unitAmountCents: 3000,
      unitHtCents,
    });

    const { calculatePack } = await import("@/features/calculator");
    const { surface, membrane } = calculatePack({
      input: DEFAULT_CALCULATOR_INPUT,
      config,
      membraneRollAreaM2: PRODUCT.roll_area_m2 as number,
      accessoryProducts: [],
    });

    const serverBuyBox = await computePdpBuyBoxAmounts(
      PRODUCT,
      "b2c",
      membrane.quantity,
      surface.grossM2,
    );

    const client = recalculatePdpBuyBoxAmounts(DEFAULT_CALCULATOR_INPUT, {
      config,
      membraneRollAreaM2: PRODUCT.roll_area_m2 as number,
      unitHtCents,
      vatRateBps: PRODUCT.vat_rate,
      shippingCents: serverBuyBox.shippingCents,
    });

    expect(client.buyBox).toEqual(serverBuyBox);
  });

  it("centimes impairs à quantité >= 2 : le sous-total suit la fonction de ligne, pas unitAmountCents × quantity", () => {
    // HT unitaire à centimes impairs, choisi pour que des cotes agrandies
    // forcent un rollQuantity >= 2 (roll_area_m2 réduit exprès).
    const unitHtCents = 1013;
    const vatRateBps = STANDARD_VAT_RATE_BPS;
    const membraneRollAreaM2 = 20;

    const input = {
      pool: { shape: "rectangle" as const, dimensions: { length: 8, width: 4, depth: 1.5 } },
      stairType: "aucun" as const,
    };

    const result = recalculatePdpBuyBoxAmounts(input, {
      config,
      membraneRollAreaM2,
      unitHtCents,
      vatRateBps,
      shippingCents: 4000,
    });

    expect(result.membrane.quantity).toBeGreaterThanOrEqual(2);

    const naiveUnitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
    const naiveTotal = naiveUnitAmountCents * result.membrane.quantity;

    expect(result.buyBox.membraneSubtotalCents).not.toBe(naiveTotal);
  });
});
