import { describe, expect, it } from "vitest";
import { calculatePack, defaultCalculatorConfig, type CalculatorInput } from "@/features/calculator";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import { computeTeaserPrice } from "./teaser-pricing";

const INPUT: CalculatorInput = {
  pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
  stairType: "aucun",
};

describe("computeTeaserPrice", () => {
  it("produit, pour un jeu de cotes donné, EXACTEMENT la même surface que le moteur 08 — preuve de non-fork", () => {
    const config = defaultCalculatorConfig();
    const membraneRollAreaM2 = 41.25;

    const { surface } = calculatePack({
      input: INPUT,
      config,
      membraneRollAreaM2,
      accessoryProducts: [],
    });

    const result = computeTeaserPrice(
      INPUT,
      { unitHtCents: 2500, vatRateBps: 2000, rollAreaM2: membraneRollAreaM2 },
      config.lossCoeffBase,
      config.lossCoeffStairs,
    );

    expect(result.surfaceM2).toBe(surface.grossM2);
  });

  it("le prix « à partir de » suit computeLineChargeFromUnitHt — cas à centimes impairs où unit × qty naïf diverge", () => {
    const config = defaultCalculatorConfig();
    const unitHtCents = 1013;
    const vatRateBps = 2000;
    // roll_area_m2 réduit exprès pour forcer un rollQuantity >= 2 sur les
    // cotes par défaut (même technique que recalculate-buy-box.test.ts).
    const rollAreaM2 = 20;

    const { membrane } = calculatePack({
      input: INPUT,
      config,
      membraneRollAreaM2: rollAreaM2,
      accessoryProducts: [],
    });
    expect(membrane.quantity).toBeGreaterThanOrEqual(2);

    const naiveUnitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
    const naiveTotal = naiveUnitAmountCents * membrane.quantity;

    const result = computeTeaserPrice(
      INPUT,
      { unitHtCents, vatRateBps, rollAreaM2 },
      config.lossCoeffBase,
      config.lossCoeffStairs,
    );

    expect(result.fromPriceTtcCents).not.toBe(naiveTotal);
    expect(result.fromPriceTtcCents).toBe(
      computeLineChargeFromUnitHt(unitHtCents, membrane.quantity, 0, vatRateBps).lineTtcCents,
    );
  });
});
