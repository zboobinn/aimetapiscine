import { getMembranes } from "@/lib/catalog/data";
import type { TeaserMembranePricing } from "./teaser-pricing";

/**
 * Le teaser (30 §03) affiche un « à partir de » basé sur le prix public de
 * la membrane la moins chère du catalogue — jamais en dur. Résolu ICI, côté
 * serveur (`page.tsx`, Server Component), et porté en donnée plate vers le
 * Client Component (même patron que `hero-swatch-options.ts`, 30 §01) : le
 * teaser ne doit jamais importer `getMembranes()`/le catalogue lui-même, ce
 * qui embarquerait le parsing Zod du catalogue entier dans son bundle client.
 * Rôle b2c uniquement (spec) : `base_price_ht` est directement le HT
 * catalogue pour ce rôle (`resolvePriceBreakdown`, 28b/29a), pas besoin de
 * résoudre un rôle ni d'appeler la chaîne `server-only`.
 */
export function resolveCheapestMembranePricing(): TeaserMembranePricing | null {
  const membranes = getMembranes();
  if (membranes.length === 0) return null;

  const cheapest = membranes.reduce((min, product) =>
    product.base_price_ht < min.base_price_ht ? product : min,
  );

  // Garanti par `catalogEntrySchema` (04) pour une MEMBRANE — vérifié ici
  // uniquement pour satisfaire le type partagé `roll_area_m2: number | null`.
  if (cheapest.roll_area_m2 === null) return null;

  return {
    unitHtCents: cheapest.base_price_ht,
    vatRateBps: cheapest.vat_rate,
    rollAreaM2: cheapest.roll_area_m2,
  };
}
