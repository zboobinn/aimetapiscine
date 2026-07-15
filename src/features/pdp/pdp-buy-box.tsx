"use client";

import { useRef } from "react";
import Link from "next/link";
import { AddToCartButton, type CartProductSummary } from "@/components/cart/add-to-cart-button";
import { SwatchGroup, type SwatchGroupOption } from "@/components/nuancier/swatch-group";
import type { StairType } from "@/features/calculator";
import { useCartStore } from "@/features/cart";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";
import { getRemakeGuaranteeCopy } from "./remake-guarantee-copy";
import { type DimensionField, usePdpContext } from "./pdp-context";

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

export interface PdpBuyBoxProps {
  compatibleAccessories: CartProductSummary[];
  /**
   * Coloris de la gamme (29 §6) — MÊME liste que le `SwatchGroup` desktop
   * rendu par la page (`[couleur]/page.tsx`) : le drawer ATC mobile (29c①)
   * en affiche un second rendu, purement décoratif (aperçu photo, sans
   * navigation ni impact sur le prix), jamais une source de prix parallèle.
   */
  swatchOptions: SwatchGroupOption[];
  selectedCouleurSlug: string;
}

/**
 * Calculateur inline + bloc prix + ATC (buy-box desktop, drawer + barre fixe
 * mobile, 29b/29c①) — lit tout son état via `usePdpContext()` (Correctif
 * hydratation 29c②, `PdpProvider` posé par `[couleur]/page.tsx`). Rendu
 * directement à sa place dans l'arbre React (plus de portail) : le SSR
 * produit exactement le même HTML que l'hydratation cliente.
 *
 * Piège 29c-① rappelé : `SwatchGroup` est importé depuis son module concret
 * (`@/components/nuancier/swatch-group`), jamais depuis le barrel
 * `@/components/nuancier` (qui réexporte `PriceBlock` → `server-only`,
 * casse `next build` depuis un Client Component).
 */
export function PdpBuyBox({ compatibleAccessories, swatchOptions, selectedCouleurSlug }: PdpBuyBoxProps) {
  const {
    product,
    mode,
    setMode,
    dimensions,
    stairType,
    errors,
    handleDimensionChange,
    handleStairChange,
    showField,
    showStairs,
    isGuidedSequenceActive,
    advanceGuidedReveal,
    panelValues,
    calculatorParamsString,
    checkedAccessoryLines,
  } = usePdpContext();

  const addCatalogLine = useCartStore((state) => state.addCatalogLine);
  const addPackLines = useCartStore((state) => state.addPackLines);
  const measureDialogRef = useRef<HTMLDialogElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);

  // Garantie de reprise (29 §8, A1) : `NEXT_PUBLIC_*` accédé EN LITTÉRAL dans
  // ce fichier client, jamais via Zod ni un accesseur `lib/env` — sinon Next
  // n'inline pas la valeur dans le bundle (piège spec 28, vérifié en 28a).
  const remakeGuaranteeCopy = getRemakeGuaranteeCopy(process.env.NEXT_PUBLIC_REMAKE_GUARANTEE);

  function handleValidateDrawer() {
    if (checkedAccessoryLines.length > 0) {
      addPackLines(
        [{ slug: product.slug, quantity: panelValues.membraneQuantity }, ...checkedAccessoryLines],
        calculatorParamsString,
      );
    } else {
      addCatalogLine(product.slug, panelValues.membraneQuantity);
    }
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
              onClick={advanceGuidedReveal}
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
        {panelValues.accessoriesCount > 0 ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt style={{ color: "var(--ink-60)" }}>Accessoires ({panelValues.accessoriesCount})</dt>
            <dd className="font-mono tabular-nums">+{formatCents(panelValues.accessoriesSubtotalCents)}</dd>
          </div>
        ) : null}
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
        packAccessoryLines={checkedAccessoryLines}
        calculatorParams={calculatorParamsString}
      />

      <ul className="flex flex-col gap-1.5 text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
        <li>✓ Garantie 10 ans</li>
        <li>
          ✓ {remakeGuaranteeCopy}{" "}
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
        partagé via `usePdpContext()`), jamais un second calculateur/état/fetch
        pro (29c①). Escape ferme nativement ; le tap hors zone ferme via le
        handler `onClick` ci-dessous (clic sur ::backdrop cible le `<dialog>`
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
