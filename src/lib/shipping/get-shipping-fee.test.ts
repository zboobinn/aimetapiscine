import { afterEach, describe, expect, it, vi } from "vitest";

const getBusinessConfigEnv = vi.fn();

vi.mock("@/lib/env", () => ({
  getBusinessConfigEnv: () => getBusinessConfigEnv(),
}));

import { getShippingFee } from "./get-shipping-fee";

const FLAT_ENV = { SHIPPING_MODE: "flat", SHIPPING_FLAT_FEE_CENTS: 4000, SHIPPING_CORSICA_SURCHARGE_CENTS: 3000 };
const INCLUDED_ENV = { SHIPPING_MODE: "included", SHIPPING_FLAT_FEE_CENTS: 4000, SHIPPING_CORSICA_SURCHARGE_CENTS: 3000 };

describe("getShippingFee", () => {
  afterEach(() => {
    getBusinessConfigEnv.mockReset();
  });

  it("mode included, sans adresse : port nul", () => {
    getBusinessConfigEnv.mockReturnValue(INCLUDED_ENV);
    expect(getShippingFee([], "b2c")).toEqual({ amountCents: 0, corsicaSurchargeApplied: false });
  });

  it("mode flat, sans adresse : frais fixe, pas de surcoût Corse", () => {
    getBusinessConfigEnv.mockReturnValue(FLAT_ENV);
    expect(getShippingFee([], "b2c")).toEqual({ amountCents: 4000, corsicaSurchargeApplied: false });
  });

  it("mode included, adresse corse : le port passe du fondu au surcoût seul", () => {
    getBusinessConfigEnv.mockReturnValue(INCLUDED_ENV);
    expect(getShippingFee([], "b2c", { postalCode: "20000" })).toEqual({
      amountCents: 3000,
      corsicaSurchargeApplied: true,
    });
  });

  it("mode flat, adresse corse : frais fixe + surcoût cumulés", () => {
    getBusinessConfigEnv.mockReturnValue(FLAT_ENV);
    expect(getShippingFee([], "b2c", { postalCode: "20000" })).toEqual({
      amountCents: 7000,
      corsicaSurchargeApplied: true,
    });
  });

  it("mode flat, adresse non corse : pas de surcoût", () => {
    getBusinessConfigEnv.mockReturnValue(FLAT_ENV);
    expect(getShippingFee([], "b2c", { postalCode: "75000" })).toEqual({
      amountCents: 4000,
      corsicaSurchargeApplied: false,
    });
  });

  it("2B (Haute-Corse, préfixe 20) déclenche aussi le surcoût", () => {
    getBusinessConfigEnv.mockReturnValue(FLAT_ENV);
    expect(getShippingFee([], "b2c", { postalCode: "20200" }).corsicaSurchargeApplied).toBe(true);
  });

  it("le rôle b2b n'exonère pas le port en V1 (paramètre non exploité aujourd'hui)", () => {
    getBusinessConfigEnv.mockReturnValue(FLAT_ENV);
    expect(getShippingFee([], "b2b")).toEqual({ amountCents: 4000, corsicaSurchargeApplied: false });
  });
});
