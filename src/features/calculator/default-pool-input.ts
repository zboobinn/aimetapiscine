import type { CalculatorInput, RectangleDimensions } from "./types";

/**
 * Cotes par défaut de la PDP (29, D5) : le prix affiché au chargement est
 * calculé sur cette dimension médiane, jamais sur un panier vide ni un
 * bouton grisé. Valeur figée par la spec — 8,00 × 4,00 × 1,50 m.
 */
export const DEFAULT_POOL_DIMENSIONS: RectangleDimensions = {
  length: 8.0,
  width: 4.0,
  depth: 1.5,
};

export const DEFAULT_CALCULATOR_INPUT: CalculatorInput = {
  pool: { shape: "rectangle", dimensions: DEFAULT_POOL_DIMENSIONS },
  stairType: "aucun",
};
