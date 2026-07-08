import type { Metadata } from "next";
import Link from "next/link";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = {
  title: "Connexion | Membranes Armées",
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">Connexion</h1>
      <p className="mt-2 text-ink-muted">
        Retrouvez vos commandes et vos factures.
      </p>
      {erreur === "lien_invalide" ? (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Ce lien n&apos;est plus valide ou a déjà été utilisé. Redemandez un
          e-mail si besoin.
        </p>
      ) : null}

      <ConnexionForm />

      <div className="mt-6 flex flex-col gap-2 text-sm text-ink-muted">
        <Link href="/mot-de-passe-oublie" className="text-accent hover:underline">
          Mot de passe oublié ?
        </Link>
        <span>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-accent hover:underline">
            Créer un compte
          </Link>
        </span>
      </div>
    </div>
  );
}
