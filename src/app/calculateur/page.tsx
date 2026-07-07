import type { Metadata } from "next";
import { Stepper } from "@/components/ui/stepper";

export const metadata: Metadata = {
  title: "Calculateur de pack | Membranes Armées",
  description:
    "Renseignez les dimensions de votre bassin et obtenez un pack prêt à poser : membrane et accessoires calculés automatiquement.",
};

export default function CalculateurPage() {
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

      <Stepper
        currentStep={1}
        steps={[
          { label: "Dimensions" },
          { label: "Forme du bassin" },
          { label: "Accessoires" },
          { label: "Récapitulatif" },
        ]}
      />

      <div className="mt-10 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
        <p className="max-w-md text-ink-muted">
          Logique de calcul à venir (spec 08). Cette page est pour l&apos;instant
          une coquille de navigation.
        </p>
      </div>
    </div>
  );
}
