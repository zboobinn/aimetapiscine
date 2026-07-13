"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddToCartButton, type CartProductSummary } from "@/components/cart/add-to-cart-button";
import type { CalculatorConfig, CalculatorInput, StairType } from "@/features/calculator";
import { DIMENSION_BOUNDS } from "@/features/calculator";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import { recalculatePdpBuyBoxAmounts, type RecalculatedPdpResult } from "./recalculate-buy-box";

/**
 * Réponse de `/api/pricing/product-price` (29b②/③) — forme structurellement
 * dépendante du rôle : un b2c n'a JAMAIS de `proUnitAmountCents`/`proUnitHtCents`
 * dans son objet (absents, pas nuls). Le prix pro n'existe dans le DOM
 * qu'après ce fetch authentifié, jamais dans le HTML ISR (D5/29b) : le rôle
 * est résolu côté serveur (`resolvePricingRole()`, cookies de session),
 * jamais transmis ni recalculé côté client — ce composant ne fait que
 * réinjecter des montants déjà résolus pour un rôle déjà vérifié dans la
 * MÊME chaîne de recalcul que le b2c (`recalculatePdpBuyBoxAmounts`, 29b①).
 */
type ProductPriceResponse =
  | { role: "b2c"; publicTtcCents: number }
  | {
      role: "b2b";
      publicTtcCents: number;
      proUnitAmountCents: number;
      proUnitHtCents: number;
    };

/** Debounce du recalcul (spec 29 §3) : synchrone, aucun appel réseau, budget INP < 150 ms. */
const RECALC_DEBOUNCE_MS = 150;

type CalculatorMode = "guided" | "direct";
type DimensionField = "length" | "width" | "depth";

const DIMENSION_LABELS: Record<DimensionField, string> = {
  length: "Longueur (L)",
  width: "Largeur (l)",
  depth: "Profondeur (P)",
};

const STAIR_OPTIONS: { value: StairType; label: string }[] = [
  { value: "aucun", label: "Aucun" },
  { value: "droit", label: "Droit" },
  { value: "roman", label: "Roman" },
  { value: "plage-immergee", label: "Plage immergée" },
];

const MEASURE_GUIDE: { title: string; body: string }[] = [
  {
    title: "Longueur (L)",
    body: "Mesurez le bassin dans sa plus grande dimension, mur à mur. (copie provisoire — OK)",
  },
  {
    title: "Largeur (l)",
    body: "Mesurez le petit côté, perpendiculairement à la longueur. (copie provisoire — OK)",
  },
  {
    title: "Profondeur (P)",
    body: "Mesurez du haut de la margelle jusqu'au point le plus bas du fond. (copie provisoire — OK)",
  },
  {
    title: "Escalier",
    body: "Le type d'escalier ajoute une surface de membrane forfaitaire au calcul. (copie provisoire — OK)",
  },
];

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

function parseDimension(raw: string): number {
  return Number(raw.replace(",", "."));
}

export interface PdpCalculatorProps {
  product: CartProductSummary;
  compatibleAccessories: CartProductSummary[];
  calculatorConfig: CalculatorConfig;
  /**
   * HT unitaire PUBLIC résolu côté serveur (`resolvePriceBreakdown`, b2c,
   * 29a) — état initial (identique au HTML SSR, D5). Bascule en interne vers
   * `proUnitHtCents` dès que le fetch authentifié (29b②/③) résout un rôle
   * b2b ; ce prop lui-même ne change jamais après montage.
   */
  unitHtCents: number;
  vatRateBps: number;
  /** `roll_area_m2` du produit (04). */
  membraneRollAreaM2: number;
  initialInput: CalculatorInput;
  /**
   * Résultat calculé côté serveur sur `initialInput` (29a,
   * `computePdpBuyBoxAmounts`) — utilisé tel quel comme état initial, jamais
   * recalculé au montage : garantit un rendu client identique au HTML SSR
   * (pas de flash, pas de saut, D5).
   */
  initialResult: RecalculatedPdpResult;
}

export function PdpCalculator({
  product,
  compatibleAccessories,
  calculatorConfig,
  unitHtCents,
  vatRateBps,
  membraneRollAreaM2,
  initialInput,
  initialResult,
}: PdpCalculatorProps) {
  const [mode, setMode] = useState<CalculatorMode>("guided");
  const [guidedRevealCount, setGuidedRevealCount] = useState(1);
  const [dimensions, setDimensions] = useState<Record<DimensionField, string>>({
    length: String(initialInput.pool.dimensions.length),
    width: String(initialInput.pool.dimensions.width),
    depth: String(initialInput.pool.dimensions.depth),
  });
  const [stairType, setStairType] = useState<StairType>(initialInput.stairType);
  const [result, setResult] = useState<RecalculatedPdpResult>(initialResult);
  const [errors, setErrors] = useState<Partial<Record<DimensionField, string>>>({});
  const measureDialogRef = useRef<HTMLDialogElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernières cotes valides ayant produit `result` — rejouées en pro dès que le fetch (29b②/③) résout un rôle b2b, sans attendre une nouvelle frappe. */
  const lastValidInputRef = useRef<CalculatorInput>(initialInput);

  const user = useAuthUser();
  const [proPricing, setProPricing] = useState<Extract<ProductPriceResponse, { role: "b2b" }>>();

  // Hydratation prix pro (29b②) : la PDP reste rendue en prix public (ISR,
  // 29a) — ce fetch, déclenché après montage et uniquement pour un
  // utilisateur connecté, COMPLÈTE l'affichage sans jamais le bloquer (l'ATC
  // reste actif pendant ce temps, D5). Un visiteur non connecté ne déclenche
  // même pas la requête.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetch(`/api/pricing/product-price?slug=${encodeURIComponent(product.slug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductPriceResponse>) : null))
      .then((data) => {
        if (!cancelled && data?.role === "b2b") setProPricing(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [product.slug, user]);

  /**
   * Montants d'entrée de la chaîne de recalcul (29b①) — publics par défaut,
   * basculent en pro dès que le fetch authentifié (29b②/③) résout un rôle
   * b2b. MÊME fonction `recalculatePdpBuyBoxAmounts`, seuls `unitHtCents`/
   * `unitAmountCents` changent : aucune seconde chaîne de calcul pour le pro.
   */
  const activeUnitHtCents = proPricing ? proPricing.proUnitHtCents : unitHtCents;
  const activeUnitAmountCents = proPricing
    ? proPricing.proUnitAmountCents
    : initialResult.buyBox.unitAmountCents;

  const recalcParams = useMemo(
    () => ({
      config: calculatorConfig,
      membraneRollAreaM2,
      unitHtCents: activeUnitHtCents,
      unitAmountCents: activeUnitAmountCents,
      vatRateBps,
      shippingCents: initialResult.buyBox.shippingCents,
    }),
    [
      calculatorConfig,
      membraneRollAreaM2,
      activeUnitHtCents,
      activeUnitAmountCents,
      vatRateBps,
      initialResult.buyBox.shippingCents,
    ],
  );

  // Bascule public → pro (29b③) : dès que `recalcParams` change de rôle
  // tarifaire (résolution du fetch authentifié), les 4 valeurs sont
  // rejouées sur les DERNIÈRES cotes valides, sans attendre une nouvelle
  // frappe. Mise à jour sèche du prix déjà affiché (D5) : aucune animation,
  // le prix change, il ne se révèle pas.
  useEffect(() => {
    setResult(recalculatePdpBuyBoxAmounts(lastValidInputRef.current, recalcParams));
  }, [recalcParams]);

  function scheduleRecalculate(nextDimensions: Record<DimensionField, string>, nextStairType: StairType) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const nextErrors: Partial<Record<DimensionField, string>> = {};
      const parsed: Partial<Record<DimensionField, number>> = {};

      (Object.keys(DIMENSION_LABELS) as DimensionField[]).forEach((field) => {
        const raw = nextDimensions[field];
        const bounds = DIMENSION_BOUNDS[field];
        const value = parseDimension(raw);

        if (raw.trim() === "" || Number.isNaN(value)) {
          nextErrors[field] = "Valeur requise";
        } else if (value < bounds.min || value > bounds.max) {
          nextErrors[field] = `Entre ${bounds.min} et ${bounds.max} m`;
        } else {
          parsed[field] = value;
        }
      });

      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) return;

      const nextInput: CalculatorInput = {
        pool: {
          shape: "rectangle",
          dimensions: {
            length: parsed.length as number,
            width: parsed.width as number,
            depth: parsed.depth as number,
          },
        },
        stairType: nextStairType,
      };

      lastValidInputRef.current = nextInput;
      setResult(recalculatePdpBuyBoxAmounts(nextInput, recalcParams));
    }, RECALC_DEBOUNCE_MS);
  }

  function handleDimensionChange(field: DimensionField, value: string) {
    const next = { ...dimensions, [field]: value };
    setDimensions(next);
    scheduleRecalculate(next, stairType);
  }

  function handleStairChange(value: StairType) {
    setStairType(value);
    scheduleRecalculate(dimensions, value);
  }

  const { surface, membrane, buyBox } = result;
  const showField = (field: DimensionField) =>
    mode === "direct" || guidedRevealCount > ["length", "width", "depth"].indexOf(field);
  const showStairs = mode === "direct" || guidedRevealCount > 3;
  const isGuidedSequenceActive = mode === "guided" && guidedRevealCount <= 3;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
        <legend className="sr-only">Mode de saisie des cotes</legend>
        <label className="flex items-center gap-2 text-[var(--step--1)]">
          <input
            type="radio"
            name="calculator-mode"
            checked={mode === "guided"}
            onChange={() => setMode("guided")}
          />
          Aidez-moi à mesurer
        </label>
        <label className="flex items-center gap-2 text-[var(--step--1)]">
          <input
            type="radio"
            name="calculator-mode"
            checked={mode === "direct"}
            onChange={() => setMode("direct")}
          />
          Je connais mes cotes
        </label>
        <button
          type="button"
          className="w-fit underline text-[var(--step--1)]"
          style={{ color: "var(--deep-blue)" }}
          onClick={() => measureDialogRef.current?.showModal()}
        >
          Comment mesurer ?
        </button>
      </fieldset>

      <div className="flex flex-col gap-3">
        {(["length", "width", "depth"] as DimensionField[]).map((field) =>
          showField(field) ? (
            <label key={field} className="flex flex-col gap-1 text-[var(--step--1)]">
              {DIMENSION_LABELS[field]}
              <input
                type="text"
                inputMode="decimal"
                value={dimensions[field]}
                onChange={(e) => handleDimensionChange(field, e.target.value)}
                className="h-10 w-full border px-3 font-mono tabular-nums"
                style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)" }}
                aria-invalid={Boolean(errors[field])}
              />
              {errors[field] ? (
                <span style={{ color: "var(--danger, #B3261E)" }}>{errors[field]}</span>
              ) : null}
            </label>
          ) : null,
        )}

        {showStairs ? (
          <div className="flex flex-col gap-1.5 text-[var(--step--1)]">
            Escalier
            <div className="flex flex-wrap gap-2">
              {STAIR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={option.value === stairType}
                  onClick={() => handleStairChange(option.value)}
                  className="border px-3 py-1.5"
                  style={{
                    borderColor: option.value === stairType ? "var(--ink)" : "var(--coping)",
                    borderRadius: "var(--radius)",
                    color: "var(--ink)",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isGuidedSequenceActive ? (
          <button
            type="button"
            className="w-fit border px-3 py-1.5 text-[var(--step--1)]"
            style={{ borderColor: "var(--ink)", borderRadius: "var(--radius)", color: "var(--ink)" }}
            onClick={() => setGuidedRevealCount((count) => Math.min(count + 1, 4))}
          >
            Suivant
          </button>
        ) : null}
      </div>

      <dl className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Surface calculée
          </dt>
          <dd className="font-mono tabular-nums text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            {surface.grossM2.toFixed(1)} m²
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>Prix au m²</dt>
          <dd className="font-mono tabular-nums">
            {buyBox.pricePerM2Cents !== null ? `${formatCents(buyBox.pricePerM2Cents)} / m²` : "—"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>
            Membrane ({membrane.quantity} rouleau{membrane.quantity > 1 ? "x" : ""})
          </dt>
          <dd className="font-mono tabular-nums">{formatCents(buyBox.membraneSubtotalCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>Livraison</dt>
          <dd className="font-mono tabular-nums">
            {buyBox.shippingCents > 0 ? `+${formatCents(buyBox.shippingCents)}` : "Incluse"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
          <dt style={{ fontSize: "var(--step-0)" }}>Total estimé {proPricing ? "HT" : "TTC"}</dt>
          <dd className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
            {formatCents(buyBox.totalCents)}
          </dd>
        </div>
      </dl>

      <AddToCartButton
        product={product}
        quantity={membrane.quantity}
        compatibleAccessories={compatibleAccessories}
      />

      <ul className="flex flex-col gap-1.5 text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
        <li>✓ Garantie 10 ans</li>
        <li>
          ✓ Découpe sur mesure —{" "}
          <Link href="/livraison-retours" className="underline" style={{ color: "var(--deep-blue)" }}>
            conditions de retour
          </Link>
        </li>
        <li>✓ {SHIPPING_DELAY_LABEL}</li>
      </ul>

      <dialog
        ref={measureDialogRef}
        className="p-0"
        style={{ border: "1px solid var(--coping)", borderRadius: "var(--radius)", maxWidth: "24rem" }}
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="font-display" style={{ fontSize: "var(--step-1)" }}>
            Comment mesurer
          </h2>
          {MEASURE_GUIDE.map((item) => (
            <div key={item.title} className="flex flex-col gap-1">
              <span className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {item.title}
              </span>
              <p>{item.body}</p>
            </div>
          ))}
          <button
            type="button"
            className="w-fit border px-3 py-1.5"
            style={{ borderColor: "var(--ink)", borderRadius: "var(--radius)", color: "var(--ink)" }}
            onClick={() => measureDialogRef.current?.close()}
          >
            Fermer
          </button>
        </div>
      </dialog>
    </div>
  );
}
