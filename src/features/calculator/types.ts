/**
 * Types du calculateur (08). Aucune dépendance React/Next ici : ce module
 * ne décrit que la forme des données manipulées par la logique pure.
 */

export type StairType = "aucun" | "droit" | "roman" | "plage-immergee";

export interface RectangleDimensions {
  /** L — longueur, mètres. */
  length: number;
  /** l — largeur, mètres. */
  width: number;
  /** P — profondeur, mètres. */
  depth: number;
}

/**
 * Union discriminée par `shape` : V1 ne couvre que le rectangle, mais
 * ajouter une forme (ronde, ovale…) se fait en étendant cette union et le
 * `switch` de `computeSurfaceBreakdown` (geometry.ts) — pas en réécrivant
 * l'algorithme existant.
 */
export type PoolInput = { shape: "rectangle"; dimensions: RectangleDimensions };

export type PoolShape = PoolInput["shape"];

export interface CalculatorInput {
  pool: PoolInput;
  stairType: StairType;
}

export interface SurfaceBreakdown {
  floorM2: number;
  wallsM2: number;
  stairsM2: number;
  /** Surface nette = fond + parois + escalier (avant coefficient de perte). */
  netM2: number;
  lossCoefficient: number;
  /** Surface brute = nette × coefficient de perte — sert au calcul de rouleaux. */
  grossM2: number;
  /** Périmètre du bassin, mètres — sert aux accessoires linéaires (profils, soudure). */
  perimeterM: number;
}

export interface CalculatorLineItem {
  sku: string;
  slug: string;
  name: string;
  quantity: number;
  unit: string;
  /** Réassurance UI : explique la quantité (« pour 52 m² de parois »). */
  motif: string;
}

export interface MembraneLine {
  quantity: number;
  unit: "rouleau";
  rollAreaM2: number;
  motif: string;
}

export interface CalculatorResult {
  surface: SurfaceBreakdown;
  membrane: MembraneLine;
  accessories: CalculatorLineItem[];
}
