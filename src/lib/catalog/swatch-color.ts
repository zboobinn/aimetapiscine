/**
 * Pastille de couleur des swatches (29/30) : le catalogue ne porte qu'un nom
 * de coloris (`couleur`), pas de valeur hex — mappage manuel, à étendre à
 * chaque nouveau coloris catalogue. Jamais `--turquoise` ici pour un coloris
 * qui n'est pas réellement turquoise (D1, la couleur du produit). Module
 * partagé (PDP 29, hero 30) pour éviter deux mappages qui divergent.
 */
const SWATCH_COLOR_BY_COULEUR: Record<string, string> = {
  bleu: "#0E5C8A",
  "gris anthracite": "#3A3D3F",
  nuage: "#D8D9D5",
};

export function swatchColorFor(couleur: string): string {
  return SWATCH_COLOR_BY_COULEUR[couleur.toLowerCase()] ?? "#B6B3AA";
}
