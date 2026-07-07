/**
 * Nombre de rouleaux de membrane nécessaires. `rollAreaM2` DOIT venir du
 * produit catalogue (`roll_area_m2`, 04) — jamais codé en dur ici (08).
 */
export function computeRollCount(grossSurfaceM2: number, rollAreaM2: number): number {
  if (rollAreaM2 <= 0) {
    throw new Error("roll_area_m2 doit être strictement positif");
  }

  return Math.ceil(grossSurfaceM2 / rollAreaM2);
}
