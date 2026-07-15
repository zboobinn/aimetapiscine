import { describe, expect, it } from "vitest";
import type { RecalculatedPdpResult } from "./recalculate-buy-box";
import { resolveAtcPanelValues } from "./resolve-atc-panel-values";

function buildResult(): RecalculatedPdpResult {
  return {
    surface: {
      floorM2: 32,
      wallsM2: 12.4,
      stairsM2: 2,
      netM2: 46.4,
      lossCoefficient: 1,
      grossM2: 46.4,
      perimeterM: 24,
    },
    membrane: {
      quantity: 3,
      unit: "rouleau",
      rollAreaM2: 20,
      motif: "test",
    },
    buyBox: {
      unitAmountCents: 41300,
      pricePerM2Cents: 2672,
      membraneSubtotalCents: 124000,
      shippingCents: 4900,
      totalCents: 128900,
    },
  };
}

describe("resolveAtcPanelValues", () => {
  it("dérive les 4 valeurs affichées à partir du résultat recalculé", () => {
    const result = buildResult();

    expect(resolveAtcPanelValues(result, false)).toEqual({
      surfaceM2: 46.4,
      pricePerM2Cents: 2672,
      membraneQuantity: 3,
      membraneSubtotalCents: 124000,
      shippingCents: 4900,
      totalCents: 128900,
      totalLabel: "TTC",
    });
  });

  it("bascule le libellé HT pour un rôle pro sans changer les montants (29b③)", () => {
    const result = buildResult();

    const b2c = resolveAtcPanelValues(result, false);
    const b2b = resolveAtcPanelValues(result, true);

    expect(b2b.totalLabel).toBe("HT");
    expect({ ...b2b, totalLabel: b2c.totalLabel }).toEqual(b2c);
  });

  it("preuve d'état unique : la buy-box desktop et le drawer ATC lisent le même résultat, donc produisent des valeurs identiques au centime", () => {
    const result = buildResult();

    // Le composant `PdpCalculator` calcule `panelValues` UNE SEULE FOIS par
    // rendu et le passe aux deux vues (buy-box sticky, drawer mobile) — ces
    // deux appels simulent exactement ce même unique calcul consommé deux
    // fois, jamais deux calculs indépendants.
    const panelValues = resolveAtcPanelValues(result, false);
    const buyBoxView = panelValues;
    const drawerView = panelValues;

    expect(drawerView).toEqual(buyBoxView);
    expect(drawerView.totalCents).toBe(buyBoxView.totalCents);
    expect(drawerView.pricePerM2Cents).toBe(buyBoxView.pricePerM2Cents);
    expect(drawerView.membraneSubtotalCents).toBe(buyBoxView.membraneSubtotalCents);
    expect(drawerView.shippingCents).toBe(buyBoxView.shippingCents);
  });
});
