import { describe, expect, it } from "vitest";

// Garde-fou (28) : chaque paire texte/fond du design system « Nuancier »
// (docs/28-design-system-nuancier.md) passe AA — vérifié, pas supposé.
// Ratios calculés selon la formule WCAG 2.x (luminance relative sRGB).
//
// Paires AUTORISÉES pour du texte (documentées ici, pas ailleurs) :
// - ink / lime-wash        : texte courant sur fond de page      -> AA corps (4.5:1)
// - ink / surface          : texte courant sur carte/buy-box      -> AA corps (4.5:1)
// - ink-60 / lime-wash     : texte secondaire sur fond de page     -> AA corps (4.5:1)
// - ink-60 / surface       : texte secondaire sur carte            -> AA corps (4.5:1)
// - deep-blue / lime-wash  : liens, focus, sur fond de page        -> AA corps (4.5:1)
// - deep-blue / surface    : liens, focus, sur carte                -> AA corps (4.5:1)
// - signal / lime-wash     : erreurs, en texte large uniquement    -> AA large (3:1)
// - signal / surface       : erreurs, en texte large uniquement    -> AA large (3:1)
//
// `--coping` (gris margelle) n'est PAS dans cette liste : réservé aux filets
// (bordures 1px), jamais utilisé comme couleur de texte (son ratio réel
// avec lime-wash/surface est ~1.9-2.1, bien en dessous même du seuil large).
// `--turquoise` n'est jamais un accent d'UI ni du texte (D1, decisions.md) :
// hors périmètre de ce test.

const TOKENS = {
  ink: "#101314",
  "lime-wash": "#F2F3EF",
  "ink-60": "#606262", // color-mix(in oklab, ink 60%, lime-wash), valeur résolue
  "deep-blue": "#0E5C8A",
  signal: "#E8452B",
  surface: "#FFFFFF",
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbChannelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_BODY = 4.5;
const AA_LARGE = 3;

const authorizedPairs: Array<{
  text: keyof typeof TOKENS;
  background: keyof typeof TOKENS;
  minRatio: number;
}> = [
  { text: "ink", background: "lime-wash", minRatio: AA_BODY },
  { text: "ink", background: "surface", minRatio: AA_BODY },
  { text: "ink-60", background: "lime-wash", minRatio: AA_BODY },
  { text: "ink-60", background: "surface", minRatio: AA_BODY },
  { text: "deep-blue", background: "lime-wash", minRatio: AA_BODY },
  { text: "deep-blue", background: "surface", minRatio: AA_BODY },
  { text: "signal", background: "lime-wash", minRatio: AA_LARGE },
  { text: "signal", background: "surface", minRatio: AA_LARGE },
];

describe("Nuancier — contraste WCAG des paires texte/fond autorisées", () => {
  it.each(authorizedPairs)(
    "$text sur $background passe le seuil AA requis ($minRatio:1)",
    ({ text, background, minRatio }) => {
      const ratio = contrastRatio(TOKENS[text], TOKENS[background]);
      expect(ratio).toBeGreaterThanOrEqual(minRatio);
    },
  );
});
