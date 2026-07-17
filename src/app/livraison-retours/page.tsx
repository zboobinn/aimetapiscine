import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Livraison & retours | Membranes Armées",
  description: "Informations de livraison et de retour de Membranes Armées.",
  alternates: { canonical: "/livraison-retours" },
};

export default function LivraisonRetoursPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Livraison & retours
      </h1>

      <h2 id="livraison" className="mt-10 font-heading text-xl font-semibold text-ink">
        Livraison
      </h2>
      <p className="mt-4 text-ink-muted">
        Contenu à venir (spec 12/22).
      </p>

      <h2 id="retours" className="mt-10 font-heading text-xl font-semibold text-ink">
        Retours
      </h2>
      <p className="mt-4 text-ink-muted">
        Contenu à venir (spec 12/22).
      </p>
    </div>
  );
}
