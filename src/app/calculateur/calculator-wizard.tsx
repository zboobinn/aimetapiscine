"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import type { CatalogEntry } from "@/lib/catalog/schema";
import {
  DIMENSION_BOUNDS,
  attachMembraneProduct,
  buildCartDraft,
  calculatePack,
  defaultCalculatorConfig,
  serializeCalculatorState,
  type CalculatorResult,
  type CalculatorUrlState,
  type StairType,
} from "@/features/calculator";
import { useCartStore } from "@/features/cart";

interface CalculatorWizardProps {
  initialUrlState: CalculatorUrlState | null;
  membranes: CatalogEntry[];
  accessories: CatalogEntry[];
  lossCoeffBase: number;
  lossCoeffStairs: number;
}

const STEPS = [
  { label: "Forme" },
  { label: "Dimensions" },
  { label: "Escalier" },
  { label: "Résultat" },
];

const STAIR_OPTIONS: { value: StairType; label: string }[] = [
  { value: "aucun", label: "Aucun escalier" },
  { value: "droit", label: "Escalier droit" },
  { value: "roman", label: "Escalier roman" },
  { value: "plage-immergee", label: "Plage immergée" },
];

type DimensionField = "length" | "width" | "depth";

const DIMENSION_LABELS: Record<DimensionField, string> = {
  length: "Longueur (L)",
  width: "Largeur (l)",
  depth: "Profondeur (P)",
};

function toDimensionStrings(
  dimensions: CalculatorUrlState["input"]["pool"]["dimensions"] | undefined,
): Record<DimensionField, string> {
  return {
    length: dimensions ? String(dimensions.length) : "",
    width: dimensions ? String(dimensions.width) : "",
    depth: dimensions ? String(dimensions.depth) : "",
  };
}

export function CalculatorWizard({
  initialUrlState,
  membranes,
  accessories,
  lossCoeffBase,
  lossCoeffStairs,
}: CalculatorWizardProps) {
  const router = useRouter();
  const addPackLines = useCartStore((state) => state.addPackLines);
  const config = useMemo(
    () => defaultCalculatorConfig({ lossCoeffBase, lossCoeffStairs }),
    [lossCoeffBase, lossCoeffStairs],
  );

  const [step, setStep] = useState(initialUrlState ? (initialUrlState.step ?? 4) : 1);
  const [dimensions, setDimensions] = useState<Record<DimensionField, string>>(
    toDimensionStrings(initialUrlState?.input.pool.dimensions),
  );
  const [stairType, setStairType] = useState<StairType>(
    initialUrlState?.input.stairType ?? "aucun",
  );
  const [selectedMembraneSlug, setSelectedMembraneSlug] = useState<string | undefined>(
    initialUrlState?.membraneSlug ?? membranes[0]?.slug,
  );
  const [addedToCart, setAddedToCart] = useState(false);

  const dimensionErrors = useMemo(() => {
    const errors: Partial<Record<DimensionField, string>> = {};

    (Object.keys(DIMENSION_LABELS) as DimensionField[]).forEach((field) => {
      const raw = dimensions[field];
      const bounds = DIMENSION_BOUNDS[field];
      const value = Number(raw.replace(",", "."));

      if (raw.trim() === "" || Number.isNaN(value)) {
        errors[field] = "Valeur requise";
      } else if (value < bounds.min || value > bounds.max) {
        errors[field] = `Entre ${bounds.min} et ${bounds.max} m`;
      }
    });

    return errors;
  }, [dimensions]);

  const dimensionsAreValid = Object.keys(dimensionErrors).length === 0;

  const selectedMembrane = membranes.find((m) => m.slug === selectedMembraneSlug) ?? membranes[0];

  const result: CalculatorResult | null = useMemo(() => {
    if (!dimensionsAreValid) return null;

    const membraneRollAreaM2 = selectedMembrane?.roll_area_m2;
    if (!membraneRollAreaM2) return null;

    return calculatePack({
      input: {
        pool: {
          shape: "rectangle",
          dimensions: {
            length: Number(dimensions.length.replace(",", ".")),
            width: Number(dimensions.width.replace(",", ".")),
            depth: Number(dimensions.depth.replace(",", ".")),
          },
        },
        stairType,
      },
      config,
      membraneRollAreaM2,
      accessoryProducts: accessories,
    });
  }, [dimensions, stairType, dimensionsAreValid, selectedMembrane, accessories, config]);

  function goToResult() {
    if (!dimensionsAreValid) return;

    setStep(4);
    setAddedToCart(false);

    const params = serializeCalculatorState({
      input: {
        pool: {
          shape: "rectangle",
          dimensions: {
            length: Number(dimensions.length.replace(",", ".")),
            width: Number(dimensions.width.replace(",", ".")),
            depth: Number(dimensions.depth.replace(",", ".")),
          },
        },
        stairType,
      },
      membraneSlug: selectedMembraneSlug,
    });
    router.replace(`/calculateur?${params.toString()}`, { scroll: false });
  }

  function handleAddToCart() {
    if (!result || !selectedMembrane) return;

    const draft = buildCartDraft(result, selectedMembrane);
    const calculatorParams = serializeCalculatorState({
      input: {
        pool: {
          shape: "rectangle",
          dimensions: {
            length: Number(dimensions.length.replace(",", ".")),
            width: Number(dimensions.width.replace(",", ".")),
            depth: Number(dimensions.depth.replace(",", ".")),
          },
        },
        stairType,
      },
      membraneSlug: selectedMembraneSlug,
    }).toString();

    addPackLines(
      draft.map(({ slug, quantity }) => ({ slug, quantity })),
      calculatorParams,
    );
    setAddedToCart(true);
  }

  return (
    <>
      <Stepper currentStep={step} steps={STEPS} />

      <div className="mt-10 flex flex-1 flex-col">
        {step === 1 ? (
          <StepShape onNext={() => setStep(2)} />
        ) : null}

        {step === 2 ? (
          <StepDimensions
            dimensions={dimensions}
            errors={dimensionErrors}
            onChange={(field, value) => setDimensions((prev) => ({ ...prev, [field]: value }))}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            canProceed={dimensionsAreValid}
          />
        ) : null}

        {step === 3 ? (
          <StepStairs
            stairType={stairType}
            onChange={setStairType}
            onBack={() => setStep(2)}
            onNext={goToResult}
          />
        ) : null}

        {step === 4 ? (
          <StepResult
            result={result}
            membranes={membranes}
            selectedMembraneSlug={selectedMembrane?.slug}
            onSelectMembrane={setSelectedMembraneSlug}
            onBack={() => setStep(3)}
            onAddToCart={handleAddToCart}
            addedToCart={addedToCart}
          />
        ) : null}
      </div>
    </>
  );
}

function StepShape({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink">Forme du bassin</h2>
        <p className="mt-1 text-ink-muted">
          Seule la forme rectangulaire est disponible pour le moment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed="true"
          className="flex flex-col items-start gap-1 rounded-lg border-2 border-accent bg-accent-surface p-4 text-left"
        >
          <span className="font-heading font-semibold text-ink">Rectangle</span>
          <span className="text-sm text-ink-muted">Bassin traditionnel à angles droits.</span>
        </button>
        <div className="flex flex-col items-start gap-1 rounded-lg border border-border p-4 text-left opacity-50">
          <span className="flex items-center gap-2 font-heading font-semibold text-ink">
            Autres formes
            <Badge variant="neutral">Bientôt</Badge>
          </span>
          <span className="text-sm text-ink-muted">Ronde, ovale, libre… à venir.</span>
        </div>
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={onNext}>
        Continuer
      </Button>
    </div>
  );
}

function StepDimensions({
  dimensions,
  errors,
  onChange,
  onBack,
  onNext,
  canProceed,
}: {
  dimensions: Record<DimensionField, string>;
  errors: Partial<Record<DimensionField, string>>;
  onChange: (field: DimensionField, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink">Dimensions du bassin</h2>
        <p className="mt-1 text-ink-muted">Mesures en mètres, jusqu&apos;à 2 décimales.</p>
      </div>

      <div className="flex flex-col gap-4">
        {(Object.keys(DIMENSION_LABELS) as DimensionField[]).map((field) => (
          <Input
            key={field}
            label={DIMENSION_LABELS[field]}
            inputMode="decimal"
            placeholder={`${DIMENSION_BOUNDS[field].min} – ${DIMENSION_BOUNDS[field].max} m`}
            value={dimensions[field]}
            error={errors[field]}
            onChange={(e) => onChange(field, e.target.value)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onBack}>
          Retour
        </Button>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}

function StepStairs({
  stairType,
  onChange,
  onBack,
  onNext,
}: {
  stairType: StairType;
  onChange: (value: StairType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink">Type d&apos;escalier</h2>
        <p className="mt-1 text-ink-muted">
          Chaque type d&apos;escalier ajoute une surface de membrane forfaitaire.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STAIR_OPTIONS.map((option) => {
          const isSelected = option.value === stairType;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`flex min-h-11 flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-2 border-accent bg-accent-surface"
                  : "border-border hover:border-accent"
              }`}
            >
              <span className="font-heading font-semibold text-ink">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onBack}>
          Retour
        </Button>
        <Button size="lg" className="w-full sm:w-auto" onClick={onNext}>
          Calculer mon pack
        </Button>
      </div>
    </div>
  );
}

function StepResult({
  result,
  membranes,
  selectedMembraneSlug,
  onSelectMembrane,
  onBack,
  onAddToCart,
  addedToCart,
}: {
  result: CalculatorResult | null;
  membranes: CatalogEntry[];
  selectedMembraneSlug: string | undefined;
  onSelectMembrane: (slug: string) => void;
  onBack: () => void;
  onAddToCart: () => void;
  addedToCart: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-ink-muted">
        Renseignez des dimensions valides pour obtenir votre pack.
      </div>
    );
  }

  const selectedMembrane = membranes.find((m) => m.slug === selectedMembraneSlug) ?? membranes[0];
  const membraneLine = selectedMembrane
    ? attachMembraneProduct(result.membrane, selectedMembrane)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink">Votre pack prêt à poser</h2>
        <p className="mt-1 text-ink-muted">
          Surface brute calculée : {result.surface.grossM2.toFixed(2)} m² (coefficient de perte
          inclus).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="membrane-select" className="text-sm font-medium text-ink">
          Gamme et coloris de membrane
        </label>
        <select
          id="membrane-select"
          value={selectedMembraneSlug}
          onChange={(e) => onSelectMembrane(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-white px-4 text-base text-ink"
        >
          {membranes.map((membrane) => (
            <option key={membrane.slug} value={membrane.slug}>
              {membrane.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {membraneLine ? (
          <li className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-heading font-semibold text-ink">{membraneLine.name}</span>
              <span className="whitespace-nowrap font-heading font-semibold text-ink">
                {membraneLine.quantity} {membraneLine.unit}
                {membraneLine.quantity > 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-sm text-ink-muted">{membraneLine.motif}</span>
          </li>
        ) : null}

        {result.accessories.map((line) => (
          <li key={line.slug} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-ink">{line.name}</span>
              <span className="whitespace-nowrap font-medium text-ink">
                {line.quantity} {line.unit}
                {line.quantity > 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-sm text-ink-muted">{line.motif}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onBack}>
          Retour
        </Button>
        <Button size="lg" className="w-full sm:w-auto" onClick={onAddToCart}>
          {addedToCart ? "Ajouté ✓" : "Ajouter le pack au panier"}
        </Button>
        {addedToCart ? (
          <Link
            href="/panier"
            className="flex min-h-11 items-center justify-center font-medium text-accent underline sm:justify-start"
          >
            Voir le panier
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-ink-muted">Remise pack -5 % à venir (spec 13).</p>
    </div>
  );
}
