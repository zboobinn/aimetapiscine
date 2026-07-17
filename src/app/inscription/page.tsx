import type { Metadata } from "next";
import Link from "next/link";
import { InscriptionForm } from "./inscription-form";

export const metadata: Metadata = {
  title: "Inscription | ArmaPool",
  robots: { index: false, follow: false },
};

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Créer un compte
      </h1>
      <p className="mt-2 text-ink-muted">
        Un compte n&apos;est jamais nécessaire pour commander : il permet de
        retrouver vos commandes et vos factures.
      </p>

      <InscriptionForm />

      <p className="mt-6 text-sm text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
