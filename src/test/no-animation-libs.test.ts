import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fou (28, docs/decisions.md D2) : zéro librairie d'animation. Le socle
// motion du design system « Nuancier » repose exclusivement sur CSS
// (`.reveal`, `animation-timeline`) — jamais gsap/motion/framer-motion/lenis/aos.
const DENYLIST = ["gsap", "motion", "framer-motion", "lenis", "aos"];

describe("package.json — garde-fou zéro librairie d'animation", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  const declaredDeps = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  it.each(DENYLIST)("n'ajoute pas la dépendance d'animation « %s »", (name) => {
    expect(declaredDeps.has(name)).toBe(false);
  });
});
