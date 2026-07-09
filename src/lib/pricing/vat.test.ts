import { describe, expect, it } from "vitest";
import { computePublicTtcCents, splitTtcAmount, STANDARD_VAT_RATE_BPS } from "./vat";

describe("splitTtcAmount", () => {
  it("HT + TVA == TTC au centime, sur une plage de valeurs (résidu, jamais un second arrondi)", () => {
    for (let ttcCents = 0; ttcCents <= 5000; ttcCents += 1) {
      const { htCents, vatCents } = splitTtcAmount(ttcCents, STANDARD_VAT_RATE_BPS);
      expect(htCents + vatCents).toBe(ttcCents);
    }
  });

  it("ventile un montant rond (4000 TTC, 20 %) sans reste", () => {
    expect(splitTtcAmount(4000, STANDARD_VAT_RATE_BPS)).toEqual({ htCents: 3333, vatCents: 667 });
  });

  it("un montant nul se ventile en zéro/zéro", () => {
    expect(splitTtcAmount(0, STANDARD_VAT_RATE_BPS)).toEqual({ htCents: 0, vatCents: 0 });
  });

  it("un taux de TVA nul renvoie l'intégralité en HT", () => {
    expect(splitTtcAmount(1234, 0)).toEqual({ htCents: 1234, vatCents: 0 });
  });
});

describe("computePublicTtcCents", () => {
  it("ajoute la TVA arrondie au HT (cas nominal)", () => {
    expect(computePublicTtcCents(3333, STANDARD_VAT_RATE_BPS)).toBe(4000);
  });

  it("un HT nul reste nul", () => {
    expect(computePublicTtcCents(0, STANDARD_VAT_RATE_BPS)).toBe(0);
  });

  it("est l'inverse approximatif de splitTtcAmount (round-trip au centime près)", () => {
    for (let baseHtCents = 1; baseHtCents <= 3000; baseHtCents += 7) {
      const ttc = computePublicTtcCents(baseHtCents, STANDARD_VAT_RATE_BPS);
      const { htCents } = splitTtcAmount(ttc, STANDARD_VAT_RATE_BPS);
      // Pas une égalité stricte garantie (deux arrondis indépendants, sens
      // inverse) : l'écart ne doit jamais dépasser 1 centime.
      expect(Math.abs(htCents - baseHtCents)).toBeLessThanOrEqual(1);
    }
  });
});
