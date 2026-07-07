import { describe, expect, it } from "vitest";
import { computeRollCount } from "./rolls";

describe("computeRollCount", () => {
  it("arrondit au rouleau supérieur", () => {
    expect(computeRollCount(78.2, 41.25)).toBe(2);
  });

  it("retourne exactement 1 quand la surface tient dans un rouleau", () => {
    expect(computeRollCount(41.25, 41.25)).toBe(1);
  });

  it("retourne exactement 1 pour une surface très inférieure à un rouleau", () => {
    expect(computeRollCount(5, 41.25)).toBe(1);
  });

  it("gère les grandes surfaces (bornes hautes du calculateur)", () => {
    expect(computeRollCount(900, 41.25)).toBe(22);
  });

  it("rejette un roll_area_m2 nul ou négatif (donnée catalogue invalide)", () => {
    expect(() => computeRollCount(50, 0)).toThrow();
    expect(() => computeRollCount(50, -1)).toThrow();
  });
});
