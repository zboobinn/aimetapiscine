import type { Metadata } from "next";
import { CalculatorWizard } from "./calculator-wizard";
import { parseCalculatorState } from "@/features/calculator";
import { getAccessories, getMembranes } from "@/lib/catalog/data";
import { getBusinessConfigEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Calculateur de pack | ArmaPool",
  description:
    "Renseignez les dimensions de votre bassin et obtenez un pack prêt à poser : membrane et accessoires calculés automatiquement.",
  // Canonical figé sur l'URL nue : l'état du calculateur vit dans les
  // searchParams (decisions.md, 2026-07-07) — sans ce canonical, chaque
  // combinaison de dimensions serait une URL indexable au contenu quasi
  // identique (duplicate content).
  alternates: { canonical: "/calculateur" },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalculateurPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const urlSearchParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (value === undefined) return [];
      return (Array.isArray(value) ? value : [value]).map((v) => [key, v] as [string, string]);
    }),
  );

  const initialUrlState = parseCalculatorState(urlSearchParams);
  const { LOSS_COEFF_BASE, LOSS_COEFF_STAIRS } = getBusinessConfigEnv();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Calculateur de pack
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Le calculateur détermine la surface de membrane et les accessoires
          nécessaires à partir des dimensions de votre bassin (08).
        </p>
      </header>

      <CalculatorWizard
        initialUrlState={initialUrlState}
        membranes={getMembranes()}
        accessories={getAccessories()}
        lossCoeffBase={LOSS_COEFF_BASE}
        lossCoeffStairs={LOSS_COEFF_STAIRS}
      />
    </div>
  );
}
