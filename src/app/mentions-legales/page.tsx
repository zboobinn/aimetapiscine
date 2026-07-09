import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales | Membranes Armées",
  description: "Mentions légales de Membranes Armées.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Mentions légales
      </h1>
      <p className="mt-6 text-ink-muted">
        Contenu à venir (spec 22).
      </p>
    </div>
  );
}
