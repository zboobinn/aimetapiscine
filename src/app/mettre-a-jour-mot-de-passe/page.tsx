import type { Metadata } from "next";

import { MettreAJourMotDePasseForm } from "./mettre-a-jour-mot-de-passe-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function MettreAJourMotDePassePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Nouveau mot de passe
      </h1>
      <p className="mt-2 text-ink-muted">Choisissez votre nouveau mot de passe.</p>

      <MettreAJourMotDePasseForm />
    </div>
  );
}
