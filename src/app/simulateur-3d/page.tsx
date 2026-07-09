import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur 3D | Membranes Armées",
  description: "Visualisez votre membrane armée en 3D avant de commander.",
  // Stub sans contenu réel (spec 16 reportée sine die, decisions.md) — à
  // retirer dès que l'intégration APF marque blanche existe.
  robots: { index: false, follow: false },
};

export default function Simulateur3DPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-8">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Simulateur 3D
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Visualisez le rendu de votre membrane sur votre bassin.
        </p>
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex h-full w-full items-center justify-center p-6 text-center">
          <p className="max-w-sm text-ink-muted">
            Intégration du simulateur 3D (marque blanche, iframe) à venir —
            spec 16.
          </p>
        </div>
      </div>
    </div>
  );
}
