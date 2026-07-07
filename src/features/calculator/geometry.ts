import type { CalculatorConfig } from "./calculator-config";
import type { PoolInput, RectangleDimensions, StairType, SurfaceBreakdown } from "./types";

export function computeFloorSurfaceM2(dimensions: RectangleDimensions): number {
  return dimensions.length * dimensions.width;
}

export function computeWallSurfaceM2(dimensions: RectangleDimensions): number {
  return 2 * (dimensions.length + dimensions.width) * dimensions.depth;
}

export function computePerimeterM(dimensions: RectangleDimensions): number {
  return 2 * (dimensions.length + dimensions.width);
}

export function computeStairSurfaceM2(stairType: StairType, config: CalculatorConfig): number {
  return config.stairSurfaceM2[stairType];
}

export function computeLossCoefficient(stairType: StairType, config: CalculatorConfig): number {
  return stairType === "aucun" ? config.lossCoeffBase : config.lossCoeffStairs;
}

function computeRectangleSurfaceBreakdown(
  dimensions: RectangleDimensions,
  stairType: StairType,
  config: CalculatorConfig,
): SurfaceBreakdown {
  const floorM2 = computeFloorSurfaceM2(dimensions);
  const wallsM2 = computeWallSurfaceM2(dimensions);
  const stairsM2 = computeStairSurfaceM2(stairType, config);
  const netM2 = floorM2 + wallsM2 + stairsM2;
  const lossCoefficient = computeLossCoefficient(stairType, config);
  const grossM2 = netM2 * lossCoefficient;
  const perimeterM = computePerimeterM(dimensions);

  return { floorM2, wallsM2, stairsM2, netM2, lossCoefficient, grossM2, perimeterM };
}

/**
 * Point d'entrée géométrie : distribue par forme (`pool.shape`). V1 ne
 * couvre que le rectangle ; ajouter une forme = ajouter un cas ici + au
 * type `PoolInput` (types.ts), sans toucher au reste du calculateur.
 */
export function computeSurfaceBreakdown(
  pool: PoolInput,
  stairType: StairType,
  config: CalculatorConfig,
): SurfaceBreakdown {
  switch (pool.shape) {
    case "rectangle":
      return computeRectangleSurfaceBreakdown(pool.dimensions, stairType, config);
    default: {
      const exhaustiveCheck: never = pool.shape;
      throw new Error(`Forme de bassin non supportée : ${String(exhaustiveCheck)}`);
    }
  }
}
