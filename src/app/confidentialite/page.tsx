import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité | Membranes Armées",
  description: "Politique de confidentialité de Membranes Armées.",
};

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Politique de confidentialité
      </h1>
      <p className="mt-6 text-ink-muted">
        Contenu à venir (spec 22).
      </p>
    </div>
  );
}
