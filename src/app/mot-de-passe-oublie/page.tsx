import type { Metadata } from "next";
import { MotDePasseOublieForm } from "./mot-de-passe-oublie-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié | ArmaPool",
  robots: { index: false, follow: false },
};

export default function MotDePasseOubliePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Mot de passe oublié
      </h1>
      <p className="mt-2 text-ink-muted">
        Recevez un lien par e-mail pour choisir un nouveau mot de passe.
      </p>

      <MotDePasseOublieForm />
    </div>
  );
}
