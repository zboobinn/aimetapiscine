import { describe, expect, it } from "vitest";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/resolve-price";
import { STANDARD_VAT_RATE_BPS } from "@/lib/pricing/vat";
import { derivePriceBlockAmounts } from "./derive-price-block-amounts";

describe("derivePriceBlockAmounts", () => {
  it("centimes impairs à quantité >= 2 : le total suit computeLineChargeFromUnitHt, pas unitAmountCents × quantity", () => {
    const unitHtCents = 1013;
    const quantity = 3;
    const vatRateBps = STANDARD_VAT_RATE_BPS;

    // unitAmountCents (TTC unitaire déjà arrondi, tel qu'affiché par
    // resolvePriceBreakdown) x quantity — c'est le calcul bugué que ce
    // correctif retire de PriceBlock.
    const unitAmountCents = unitHtCents + Math.round((unitHtCents * vatRateBps) / 10000);
    const buggyTotalCents = unitAmountCents * quantity;

    const { lineTtcCents } = computeLineChargeFromUnitHt(unitHtCents, quantity, 0, vatRateBps);

    // Preuve que le cas est bien piégeux : les deux calculs divergent.
    expect(buggyTotalCents).not.toBe(lineTtcCents);

    const amounts = derivePriceBlockAmounts(unitHtCents, quantity, vatRateBps, null);

    expect(amounts.lineTtcCents).toBe(lineTtcCents);
    expect(amounts.lineTtcCents).not.toBe(buggyTotalCents);
  });

  it("le €/m² est le total de ligne (remise incluse) divisé par la surface totale, jamais le prix unitaire / roll_area_m2", () => {
    const unitHtCents = 1013;
    const quantity = 3;
    const rollAreaM2 = 41.25;
    const vatRateBps = STANDARD_VAT_RATE_BPS;

    const { lineTtcCents } = computeLineChargeFromUnitHt(unitHtCents, quantity, 0, vatRateBps);
    const amounts = derivePriceBlockAmounts(unitHtCents, quantity, vatRateBps, rollAreaM2);

    expect(amounts.pricePerM2Cents).toBe(lineTtcCents / (rollAreaM2 * quantity));
  });

  it("pas de roll_area_m2 (accessoire) : pricePerM2Cents est null", () => {
    const amounts = derivePriceBlockAmounts(1013, 3, STANDARD_VAT_RATE_BPS, null);
    expect(amounts.pricePerM2Cents).toBeNull();
  });
});
