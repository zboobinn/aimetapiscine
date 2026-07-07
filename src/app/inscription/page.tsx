import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Inscription | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Créer un compte
      </h1>
      <p className="mt-2 text-ink-muted">
        Authentification Supabase à venir (spec 14).
      </p>

      <form className="mt-8 flex flex-col gap-6">
        <Input label="Adresse e-mail" type="email" placeholder="vous@exemple.fr" />
        <Input label="Mot de passe" type="password" />
        <Button variant="primary" size="lg" type="submit">
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
