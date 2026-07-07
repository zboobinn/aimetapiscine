import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Connexion | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">Connexion</h1>
      <p className="mt-2 text-ink-muted">
        Authentification Supabase à venir (spec 14).
      </p>

      <form className="mt-8 flex flex-col gap-6">
        <Input label="Adresse e-mail" type="email" placeholder="vous@exemple.fr" />
        <Input label="Mot de passe" type="password" />
        <Button variant="primary" size="lg" type="submit">
          Se connecter
        </Button>
      </form>

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
