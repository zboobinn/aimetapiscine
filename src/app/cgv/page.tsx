import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales de vente | Membranes Armées",
  description: "CGV de Membranes Armées.",
};

export default function CGVPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Conditions générales de vente
      </h1>
      <p className="mt-6 text-ink-muted">
        Contenu à venir (spec 22).
      </p>
    </div>
  );
}
