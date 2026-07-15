"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddToCartButton, type CartProductSummary } from "@/components/cart/add-to-cart-button";
import { SwatchGroup, type SwatchGroupOption } from "@/components/nuancier/swatch-group";
import type { CalculatorConfig, CalculatorInput, StairType } from "@/features/calculator";
import { DIMENSION_BOUNDS } from "@/features/calculator";
import { useCartStore } from "@/features/cart";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import { recalculatePdpBuyBoxAmounts, type RecalculatedPdpResult } from "./recalculate-buy-box";
import { resolveAtcPanelValues } from "./resolve-atc-panel-values";

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
  /**
   * Coloris de la gamme (29 §6) — MÊME liste que le `SwatchGroup` desktop
   * rendu par la page (`[couleur]/page.tsx`) : le drawer ATC mobile (29c①)
   * en affiche un second rendu, purement décoratif (aperçu photo, sans
   * navigation ni impact sur le prix), jamais une source de prix parallèle.
   */
  swatchOptions: SwatchGroupOption[];
  selectedCouleurSlug: string;
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
  swatchOptions,
  selectedCouleurSlug,
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
  const drawerRef = useRef<HTMLDialogElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addCatalogLine = useCartStore((state) => state.addCatalogLine);
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

  const showField = (field: DimensionField) =>
    mode === "direct" || guidedRevealCount > ["length", "width", "depth"].indexOf(field);
  const showStairs = mode === "direct" || guidedRevealCount > 3;
  const isGuidedSequenceActive = mode === "guided" && guidedRevealCount <= 3;

  /**
   * Calculé UNE FOIS par rendu (29c①, `resolveAtcPanelValues`) : la buy-box
   * desktop et le drawer ATC mobile lisent tous deux `panelValues`, jamais
   * `result`/`proPricing` séparément — aucun second calcul, aucune
   * divergence possible entre les deux vues.
   */
  const panelValues = resolveAtcPanelValues(result, Boolean(proPricing));

  function handleValidateDrawer() {
    addCatalogLine(product.slug, panelValues.membraneQuantity);
    drawerRef.current?.close();
  }

  function renderCalculatorFields(idPrefix: string) {
    return (
      <>
        <fieldset className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
          <legend className="sr-only">Mode de saisie des cotes</legend>
          <label className="flex items-center gap-2 text-[var(--step--1)]">
            <input
              type="radio"
              name={`calculator-mode-${idPrefix}`}
              checked={mode === "guided"}
              onChange={() => setMode("guided")}
            />
            Aidez-moi à mesurer
          </label>
          <label className="flex items-center gap-2 text-[var(--step--1)]">
            <input
              type="radio"
              name={`calculator-mode-${idPrefix}`}
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
      </>
    );
  }

  function renderPriceBlock() {
    return (
      <dl className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Surface calculée
          </dt>
          <dd className="font-mono tabular-nums text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            {panelValues.surfaceM2.toFixed(1)} m²
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>Prix au m²</dt>
          <dd className="font-mono tabular-nums">
            {panelValues.pricePerM2Cents !== null
              ? `${formatCents(panelValues.pricePerM2Cents)} / m²`
              : "—"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>
            Membrane ({panelValues.membraneQuantity} rouleau
            {panelValues.membraneQuantity > 1 ? "x" : ""})
          </dt>
          <dd className="font-mono tabular-nums">{formatCents(panelValues.membraneSubtotalCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt style={{ color: "var(--ink-60)" }}>Livraison</dt>
          <dd className="font-mono tabular-nums">
            {panelValues.shippingCents > 0 ? `+${formatCents(panelValues.shippingCents)}` : "Incluse"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
          <dt style={{ fontSize: "var(--step-0)" }}>Total estimé {panelValues.totalLabel}</dt>
          <dd className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
            {formatCents(panelValues.totalCents)}
          </dd>
        </div>
      </dl>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {renderCalculatorFields("desktop")}
      {renderPriceBlock()}

      <AddToCartButton
        product={product}
        quantity={panelValues.membraneQuantity}
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

      {/*
        ATC drawer persistant mobile (29 §2, 29c①). Bouton fixe visible
        uniquement sous `lg` (desktop garde la buy-box sticky, 29 §1) —
        toujours actif (D5), jamais grisé : il n'attend rien, il ouvre le
        drawer sur les cotes/le prix courants. `--atc-bar-h` (globals.css)
        est la SEULE source de la hauteur réservée : à la fois la hauteur
        minimale de cette barre et le padding-bottom de la page
        ([couleur]/page.tsx, `.pdp-page-padding`) — un seul nombre, aucun
        risque de désynchronisation entre les deux.
      */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t px-4 lg:hidden"
        style={{
          minHeight: "var(--atc-bar-h)",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "var(--surface)",
          borderColor: "var(--coping)",
        }}
      >
        <div className="flex flex-col">
          <span className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Total estimé {panelValues.totalLabel}
          </span>
          <span className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
            {formatCents(panelValues.totalCents)}
          </span>
        </div>
        <button
          type="button"
          className="border px-4 py-2.5 font-medium"
          style={{ borderColor: "var(--ink)", borderRadius: "var(--radius)", color: "var(--ink)" }}
          onClick={() => drawerRef.current?.showModal()}
        >
          Ajouter au panier
        </button>
      </div>

      {/*
        `<dialog>` natif (pas de lib, pas de portail maison) — mêmes champs
        que la buy-box (renderCalculatorFields/renderPriceBlock, état
        partagé), jamais un second calculateur/état/fetch pro (29c①).
        Escape ferme nativement ; le tap hors zone ferme via le handler
        `onClick` ci-dessous (clic sur ::backdrop cible le `<dialog>`
        lui-même, seul moyen non-lib de détecter un tap hors contenu).
      */}
      <dialog
        ref={drawerRef}
        className="atc-drawer w-full p-0 lg:hidden"
        aria-label="Ajouter au panier"
        style={{
          border: "1px solid var(--coping)",
          borderRadius: "var(--radius) var(--radius) 0 0",
        }}
        onClick={(e) => {
          if (e.target === drawerRef.current) drawerRef.current?.close();
        }}
      >
        <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display" style={{ fontSize: "var(--step-1)" }}>
              {product.name}
            </h2>
            <button
              type="button"
              aria-label="Fermer"
              className="border px-2 py-1"
              style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", color: "var(--ink)" }}
              onClick={() => drawerRef.current?.close()}
            >
              ✕
            </button>
          </div>

          {swatchOptions.length > 0 ? (
            <div style={{ maxWidth: "9rem" }}>
              <SwatchGroup
                label="Coloris de la membrane"
                options={swatchOptions}
                defaultSelectedId={selectedCouleurSlug}
              />
            </div>
          ) : null}

          {renderCalculatorFields("drawer")}
          {renderPriceBlock()}

          <button
            type="button"
            className="w-full border px-4 py-3 font-medium"
            style={{
              borderColor: "var(--ink)",
              borderRadius: "var(--radius)",
              color: "var(--surface)",
              background: "var(--ink)",
            }}
            disabled={!product.inStock}
            onClick={handleValidateDrawer}
          >
            {product.inStock ? `Valider — ${formatCents(panelValues.totalCents)}` : "Indisponible"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
