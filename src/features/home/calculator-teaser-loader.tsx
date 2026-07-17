"use client";

import dynamic from "next/dynamic";
import type { CalculatorTeaserProps } from "./calculator-teaser";

const CalculatorTeaser = dynamic(
  () => import("./calculator-teaser").then((mod) => mod.CalculatorTeaser),
  { ssr: false },
);

/**
 * `next/dynamic({ ssr: false })` n'est autorisé que depuis un Client
 * Component (Next.js App Router) — `page.tsx` (Server Component) importe CE
 * wrapper, jamais `calculator-teaser.tsx` directement. Seul endroit de la
 * homepage (30 §03) qui charge en `ssr: false` : le teaser est sous la ligne
 * de flottaison, sans valeur SEO. Sur la PDP (29 §3), le calculateur inline
 * reste importé directement (SSR) pour le SEO du prix — pas le même arbitrage.
 */
export function CalculatorTeaserLoader(props: CalculatorTeaserProps) {
  return <CalculatorTeaser {...props} />;
}
