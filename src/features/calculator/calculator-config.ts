import type { StairType } from "./types";

/**
 * Paramètres ajustables du calculateur (08). Regroupés ici pour rester
 * modifiables sans toucher aux fonctions pures (geometry.ts, rolls.ts,
 * accessories.ts) : changer un coefficient ou un forfait ne doit jamais
 * demander de relire l'algorithme.
 *
 * `lossCoeffBase` / `lossCoeffStairs` sont surchargeables par variable
 * d'environnement (`LOSS_COEFF_BASE` / `LOSS_COEFF_STAIRS`, 26) — mais
 * cette lecture se fait UNIQUEMENT côté serveur (`getBusinessConfigEnv()`,
 * `src/lib/env`), jamais ici : ce fichier reste sans accès réseau/process.env
 * et n'expose que les valeurs par défaut + la fabrique `defaultCalculatorConfig`
 * qui accepte des overrides déjà résolus.
 */

export const DEFAULT_LOSS_COEFF_BASE = 1.15;
export const DEFAULT_LOSS_COEFF_STAIRS = 1.2;

/** Bornes réalistes des dimensions saisissables (mètres) — spec 08. */
export const DIMENSION_BOUNDS = {
  length: { min: 2, max: 25 },
  width: { min: 1, max: 15 },
  depth: { min: 0.5, max: 3 },
} as const;

/**
 * Surfaces forfaitaires ajoutées à la surface nette selon le type
 * d'escalier (08). VALEURS PROVISOIRES — à remplacer dès réception des
 * fiches techniques APF (rendements réels pas encore communiqués).
 */
export const STAIR_SURFACE_M2: Record<StairType, number> = {
  aucun: 0,
  droit: 4,
  roman: 6,
  "plage-immergee": 8,
};

export type AccessoryDemandBasis = "surface" | "perimeter";

export interface AccessoryYieldRule {
  /** Grandeur du besoin à couvrir : surface brute (m²) ou périmètre (ml). */
  demandBasis: AccessoryDemandBasis;
  /**
   * Clé à lire dans `coverage` (04, catalogue) : le RENDEMENT (combien de
   * m²/ml une unité vendable couvre) vient toujours du catalogue, jamais
   * codé en dur ici — seule la clé à lire et la grandeur de besoin sont
   * fixées par catégorie.
   */
  coverageKey: string;
}

/**
 * Mappe chaque catégorie d'accessoire (04) à sa grandeur de besoin et à la
 * clé `coverage` correspondante. Catégories couvertes par 08 : feutre
 * (surface), colle (surface), PVC liquide (linéaire de soudure), profils
 * Hung (périmètre), solvant (linéaire de soudure). `AUTRE` n'a pas de règle
 * : ces produits ne sont pas ajoutés automatiquement au pack.
 */
export const ACCESSORY_YIELD_RULES: Record<string, AccessoryYieldRule> = {
  FEUTRE: { demandBasis: "surface", coverageKey: "m2_per_unit" },
  COLLE: { demandBasis: "surface", coverageKey: "m2_per_unit" },
  PVC_LIQUIDE: { demandBasis: "perimeter", coverageKey: "ml_per_unit" },
  PROFIL: { demandBasis: "perimeter", coverageKey: "ml_per_barre" },
  SOLVANT: { demandBasis: "perimeter", coverageKey: "ml_per_unit" },
};

export interface CalculatorConfig {
  lossCoeffBase: number;
  lossCoeffStairs: number;
  stairSurfaceM2: Record<StairType, number>;
  dimensionBounds: typeof DIMENSION_BOUNDS;
  accessoryYield: Record<string, AccessoryYieldRule>;
}

export interface CalculatorConfigOverrides {
  lossCoeffBase?: number;
  lossCoeffStairs?: number;
}

/**
 * Fabrique la config utilisée par `calculatePack`. Les overrides
 * (coefficients résolus depuis l'env côté serveur) sont optionnels : sans
 * eux, les défauts de la spec (1.15 / 1.20) s'appliquent — utile pour les
 * tests unitaires et les scripts hors runtime Next.js.
 */
export function defaultCalculatorConfig(
  overrides: CalculatorConfigOverrides = {},
): CalculatorConfig {
  return {
    lossCoeffBase: overrides.lossCoeffBase ?? DEFAULT_LOSS_COEFF_BASE,
    lossCoeffStairs: overrides.lossCoeffStairs ?? DEFAULT_LOSS_COEFF_STAIRS,
    stairSurfaceM2: STAIR_SURFACE_M2,
    dimensionBounds: DIMENSION_BOUNDS,
    accessoryYield: ACCESSORY_YIELD_RULES,
  };
}
