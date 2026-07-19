/**
 * Constantes visuelles de la passe E (30, redesign ArmaPool) — SCOPÉES à la
 * route `/` uniquement. N'écrivent PAS dans les tokens partagés de la spec 28
 * (`--radius`, pas d'ombre) : la maquette amende ces invariants pour la home
 * seule (docs/decisions.md, override consigné par Léo), le reste du site
 * (PDP, nuancier, calculateur expert) garde `--radius: 2px` / zéro ombre.
 */
export const HOME_RADIUS = "10px";
export const HOME_SHADOW = "0 1px 2px rgba(14, 19, 20, 0.04), 0 8px 24px rgba(14, 19, 20, 0.08)";
export const HOME_CARD_BG = "#F7F8FA";
