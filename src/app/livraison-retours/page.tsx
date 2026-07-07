import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Livraison & retours | Membranes Armées",
  description: "Informations de livraison et de retour de Membranes Armées.",
};

export default function LivraisonRetoursPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Livraison & retours
      </h1>
      <p className="mt-6 text-ink-muted">
        Contenu à venir (spec 12/22).
      </p>
    </div>
  );
}
