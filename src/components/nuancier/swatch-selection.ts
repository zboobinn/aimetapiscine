/**
 * Logique pure de sélection de `SwatchGroup` (30 §1) — extraite du composant
 * (`.tsx`, sans config JSX Vitest, même contrainte que
 * `derive-price-block-amounts.ts`, 28b) pour rester testable en `.test.ts`.
 * Patron React standard « contrôlé si `selectedId` est fourni, sinon replie
 * sur l'état interne » — `undefined` est le seul sentinel de non-contrôle,
 * jamais une chaîne vide (les id de coloris ne sont jamais vides).
 */

export interface SwatchSelectionOption {
  id: string;
}

/** Sélection initiale de l'état interne (mode non contrôlé) au montage. */
export function resolveInitialSelectedId(
  options: readonly SwatchSelectionOption[],
  defaultSelectedId?: string,
): string | undefined {
  return defaultSelectedId ?? options[0]?.id;
}

/** Un `selectedId` défini bascule le composant en mode contrôlé. */
export function isSwatchGroupControlled(selectedId: string | undefined): boolean {
  return selectedId !== undefined;
}

/** Sélection active affichée : le prop contrôlé prime sur l'état interne. */
export function resolveActiveSelectedId(
  selectedId: string | undefined,
  internalSelectedId: string | undefined,
): string | undefined {
  return selectedId ?? internalSelectedId;
}

/** Navigation clavier ←→/↑↓ : déplacement circulaire d'un cran. */
export function computeNextSwatchIndex(currentIndex: number, delta: 1 | -1, length: number): number {
  return (currentIndex + delta + length) % length;
}
