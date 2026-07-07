import { z } from "zod";
import { DIMENSION_BOUNDS } from "./calculator-config";
import type { CalculatorInput } from "./types";

/**
 * Sérialisation du résultat dans l'URL (08 : `/calculateur?l=8&w=4&d=1.5&stairs=roman`).
 * Fonctions pures (parsing de chaînes uniquement, pas d'accès réseau) :
 * réutilisables aussi bien côté Server Component (lecture des search params
 * à l'arrivée) que côté client (mise à jour au fil du parcours).
 */

const stairTypeSchema = z.enum(["aucun", "droit", "roman", "plage-immergee"]);

const urlStateSchema = z.object({
  shape: z.literal("rectangle"),
  l: z.coerce.number().min(DIMENSION_BOUNDS.length.min).max(DIMENSION_BOUNDS.length.max),
  w: z.coerce.number().min(DIMENSION_BOUNDS.width.min).max(DIMENSION_BOUNDS.width.max),
  d: z.coerce.number().min(DIMENSION_BOUNDS.depth.min).max(DIMENSION_BOUNDS.depth.max),
  stairs: stairTypeSchema,
  // Gamme/couleur choisies à l'étape résultat (08) : indépendant des quantités.
  membrane: z.string().min(1).optional(),
});

export interface CalculatorUrlState {
  input: CalculatorInput;
  membraneSlug?: string;
}

export function serializeCalculatorState(state: CalculatorUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const { input, membraneSlug } = state;

  params.set("shape", input.pool.shape);
  params.set("l", String(input.pool.dimensions.length));
  params.set("w", String(input.pool.dimensions.width));
  params.set("d", String(input.pool.dimensions.depth));
  params.set("stairs", input.stairType);
  if (membraneSlug) params.set("membrane", membraneSlug);

  return params;
}

/** Retourne `null` si les search params ne décrivent pas un état complet/valide. */
export function parseCalculatorState(params: URLSearchParams): CalculatorUrlState | null {
  const raw = Object.fromEntries(params.entries());
  const parsed = urlStateSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    input: {
      pool: {
        shape: "rectangle",
        dimensions: { length: parsed.data.l, width: parsed.data.w, depth: parsed.data.d },
      },
      stairType: parsed.data.stairs,
    },
    membraneSlug: parsed.data.membrane,
  };
}
