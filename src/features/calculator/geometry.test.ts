import { describe, expect, it } from "vitest";
import { defaultCalculatorConfig } from "./calculator-config";
import {
  computeFloorSurfaceM2,
  computeLossCoefficient,
  computePerimeterM,
  computeSurfaceBreakdown,
  computeWallSurfaceM2,
} from "./geometry";

const config = defaultCalculatorConfig();

describe("computeFloorSurfaceM2", () => {
  it("multiplie longueur × largeur", () => {
    expect(computeFloorSurfaceM2({ length: 8, width: 4, depth: 1.5 })).toBe(32);
  });
});

describe("computeWallSurfaceM2", () => {
  it("applique 2×(L+l)×P", () => {
    expect(computeWallSurfaceM2({ length: 8, width: 4, depth: 1.5 })).toBe(36);
  });
});

describe("computePerimeterM", () => {
  it("applique 2×(L+l)", () => {
    expect(computePerimeterM({ length: 8, width: 4, depth: 1.5 })).toBe(24);
  });
});

describe("computeLossCoefficient", () => {
  it("retourne le coefficient de base sans escalier", () => {
    expect(computeLossCoefficient("aucun", config)).toBe(1.15);
  });

  it("retourne le coefficient escalier pour tout type d'escalier", () => {
    expect(computeLossCoefficient("droit", config)).toBe(1.2);
    expect(computeLossCoefficient("roman", config)).toBe(1.2);
    expect(computeLossCoefficient("plage-immergee", config)).toBe(1.2);
  });

  it("respecte les coefficients surchargés (26)", () => {
    const customConfig = defaultCalculatorConfig({ lossCoeffBase: 1.1, lossCoeffStairs: 1.25 });
    expect(computeLossCoefficient("aucun", customConfig)).toBe(1.1);
    expect(computeLossCoefficient("roman", customConfig)).toBe(1.25);
  });
});

describe("computeSurfaceBreakdown", () => {
  it("calcule la surface nette et brute sans escalier", () => {
    const result = computeSurfaceBreakdown(
      { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
      "aucun",
      config,
    );

    expect(result.floorM2).toBe(32);
    expect(result.wallsM2).toBe(36);
    expect(result.stairsM2).toBe(0);
    expect(result.netM2).toBe(68);
    expect(result.lossCoefficient).toBe(1.15);
    expect(result.grossM2).toBeCloseTo(78.2, 5);
    expect(result.perimeterM).toBe(24);
  });

  it("ajoute la surface forfaitaire et le coefficient escalier avec un escalier roman", () => {
    const result = computeSurfaceBreakdown(
      { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
      "roman",
      config,
    );

    expect(result.stairsM2).toBe(6);
    expect(result.netM2).toBe(74);
    expect(result.lossCoefficient).toBe(1.2);
    expect(result.grossM2).toBeCloseTo(88.8, 5);
  });

  it("calcule les bornes minimales réalistes (L2/l1/P0.5)", () => {
    const result = computeSurfaceBreakdown(
      { shape: "rectangle", dimensions: { length: 2, width: 1, depth: 0.5 } },
      "aucun",
      config,
    );

    expect(result.floorM2).toBe(2);
    expect(result.wallsM2).toBe(3);
    expect(result.netM2).toBe(5);
  });

  it("calcule les bornes maximales réalistes (L25/l15/P3)", () => {
    const result = computeSurfaceBreakdown(
      { shape: "rectangle", dimensions: { length: 25, width: 15, depth: 3 } },
      "aucun",
      config,
    );

    expect(result.floorM2).toBe(375);
    expect(result.wallsM2).toBe(240);
    expect(result.netM2).toBe(615);
  });
});
