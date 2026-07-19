"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIMENSION_BOUNDS,
  serializeCalculatorState,
  type CalculatorInput,
} from "@/features/calculator";
import { HOME_CARD_BG, HOME_RADIUS, HOME_SHADOW } from "./home-look";
import { computeTeaserPrice, type TeaserMembranePricing } from "./teaser-pricing";

type DimensionField = "length" | "width" | "depth";

const DIMENSION_LABELS: Record<DimensionField, string> = {
  length: "Longueur",
  width: "Largeur",
  depth: "Profondeur",
};

const DEFAULT_DIMENSIONS: Record<DimensionField, string> = {
  length: "8",
  width: "4",
  depth: "1,5",
};

interface ShapeOption {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

/**
 * Seule la forme rectangulaire est calculable : le moteur (08) ne couvre que
 * `PoolInput["shape"] === "rectangle"` en V1 — exactement la même limite que
 * l'étape 1 du calculateur expert (`calculator-wizard.tsx`, `StepShape`).
 * Les 3 autres options du mockup (30 §03) sont affichées, désactivées,
 * jamais retirées : c'est une promesse de roadmap, pas un fork du moteur
 * pour leur donner un résultat.
 */
const SHAPE_OPTIONS: ShapeOption[] = [
  { value: "rectangle", label: "Rectangulaire", description: "Bassin traditionnel à angles droits.", available: true },
  { value: "ovale", label: "Ovale", description: "Bientôt disponible.", available: false },
  { value: "haricot", label: "Haricot", description: "Bientôt disponible.", available: false },
  { value: "sur-plan", label: "Sur plan", description: "Bientôt disponible.", available: false },
];

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const surfaceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Décimales françaises (virgule) — jamais `.toFixed()` brut (30 §03). */
function formatSurfaceM2(surfaceM2: number): string {
  return surfaceFormatter.format(surfaceM2);
}

export interface CalculatorTeaserProps {
  pricing: TeaserMembranePricing;
  lossCoeffBase: number;
  lossCoeffStairs: number;
}

/**
 * Teaser calculateur (30 §03) : 3 champs, une forme, un prix « à partir de ».
 * Chargé en `next/dynamic({ ssr: false })` depuis `page.tsx` — ICI SEULEMENT
 * (30, contrairement à la PDP qui reste SSR pour le SEO du prix, 29 §3) car
 * sous la ligne de flottaison, sans valeur SEO propre.
 *
 * Aucune animation sur le prix (D4/D5, docs/decisions.md) : la valeur change,
 * elle ne se révèle pas — aucune classe `transition`/`.reveal` sur le bloc
 * résultat.
 */
export function CalculatorTeaser({ pricing, lossCoeffBase, lossCoeffStairs }: CalculatorTeaserProps) {
  const router = useRouter();
  const [dimensions, setDimensions] = useState<Record<DimensionField, string>>(DEFAULT_DIMENSIONS);

  const errors = useMemo(() => {
    const result: Partial<Record<DimensionField, string>> = {};

    (Object.keys(DIMENSION_LABELS) as DimensionField[]).forEach((field) => {
      const bounds = DIMENSION_BOUNDS[field];
      const raw = dimensions[field];
      const value = Number(raw.replace(",", "."));

      if (raw.trim() === "" || Number.isNaN(value)) {
        result[field] = "Requis";
      } else if (value < bounds.min || value > bounds.max) {
        result[field] = `Entre ${bounds.min} et ${bounds.max} m`;
      }
    });

    return result;
  }, [dimensions]);

  const isValid = Object.keys(errors).length === 0;

  // Calcul synchrone, aucun debounce : la seule opération est de
  // l'arithmétique pure (30 §03, budget < 100 ms après la 3e frappe).
  const parsedInput: CalculatorInput | null = useMemo(() => {
    if (!isValid) return null;

    return {
      pool: {
        shape: "rectangle",
        dimensions: {
          length: Number(dimensions.length.replace(",", ".")),
          width: Number(dimensions.width.replace(",", ".")),
          depth: Number(dimensions.depth.replace(",", ".")),
        },
      },
      stairType: "aucun",
    };
  }, [dimensions, isValid]);

  const result = useMemo(() => {
    if (!parsedInput) return null;
    return computeTeaserPrice(parsedInput, pricing, lossCoeffBase, lossCoeffStairs);
  }, [parsedInput, pricing, lossCoeffBase, lossCoeffStairs]);

  function handleContinue() {
    if (!parsedInput) return;

    // Effet d'escalier (30 §03) : l'état passe par l'URL (`url-state.ts`,
    // déjà existant, 08) — le calculateur expert s'ouvre directement à
    // l'étape Dimensions (`step: 2`), déjà pré-rempli. Aucune ressaisie.
    const params = serializeCalculatorState({ input: parsedInput, step: 2 });
    router.push(`/calculateur?${params.toString()}`);
  }

  return (
    <section
      aria-label="Estimez votre membrane en 3 mesures"
      className="mx-auto w-full px-4 py-12 sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <div className="flex flex-col gap-2 pb-8">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
          Estimez votre besoin en 3 mesures
        </h2>
        <p style={{ color: "var(--ink-60)", maxWidth: "var(--measure)" }}>
          Longueur, largeur, profondeur — un prix « à partir de » apparaît aussitôt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <fieldset
          className="flex flex-col gap-3 border p-4"
          style={{ borderColor: "var(--coping)", borderRadius: HOME_RADIUS, boxShadow: HOME_SHADOW, background: HOME_CARD_BG }}
        >
          <legend className="px-1 font-medium" style={{ color: "var(--ink)" }}>
            Forme du bassin
          </legend>
          {SHAPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 border p-3"
              style={{
                borderColor: option.value === "rectangle" ? "var(--turquoise)" : "var(--coping)",
                borderWidth: option.value === "rectangle" ? "2px" : "1px",
                borderRadius: HOME_RADIUS,
                background: option.value === "rectangle" ? "color-mix(in oklab, var(--turquoise) 8%, white)" : "var(--surface)",
                opacity: option.available ? 1 : 0.5,
              }}
            >
              <input
                type="radio"
                name="teaser-shape"
                value={option.value}
                checked={option.value === "rectangle"}
                disabled={!option.available}
                readOnly
                style={{ accentColor: "var(--turquoise)" }}
              />
              <span className="flex flex-col">
                <span className="font-medium" style={{ color: "var(--ink)" }}>
                  {option.label}
                </span>
                <span className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div
          className="flex flex-col gap-4 border p-4"
          style={{ borderColor: "var(--coping)", borderRadius: HOME_RADIUS, boxShadow: HOME_SHADOW, background: HOME_CARD_BG }}
        >
          <div className="flex flex-col gap-3">
            {(Object.keys(DIMENSION_LABELS) as DimensionField[]).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[var(--step--1)]" style={{ color: "var(--ink)" }}>
                  {DIMENSION_LABELS[field]} (m)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={dimensions[field]}
                  onChange={(e) =>
                    setDimensions((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="h-11 w-full border px-3 font-mono tabular-nums"
                  style={{ borderColor: "var(--coping)", borderRadius: HOME_RADIUS, background: "var(--surface)" }}
                  aria-invalid={Boolean(errors[field])}
                />
                {errors[field] ? (
                  <span className="text-[var(--step--1)]" style={{ color: "var(--danger, #B3261E)" }}>
                    {errors[field]}
                  </span>
                ) : null}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
            <div className="flex items-baseline justify-between gap-4">
              <span style={{ color: "var(--ink-60)" }}>Surface</span>
              <span className="font-mono tabular-nums">
                {result ? `${formatSurfaceM2(result.surfaceM2)} m²` : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span style={{ color: "var(--ink-60)" }}>À partir de</span>
              <span className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
                {result ? `${formatCents(result.fromPriceTtcCents)} TTC` : "—"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="w-full border px-4 py-3 font-medium disabled:opacity-50"
            style={{
              borderColor: "var(--turquoise)",
              borderRadius: HOME_RADIUS,
              color: "var(--surface)",
              background: "var(--turquoise)",
            }}
            disabled={!result}
            onClick={handleContinue}
          >
            Continuer sur le calculateur →
          </button>
        </div>
      </div>
    </section>
  );
}
