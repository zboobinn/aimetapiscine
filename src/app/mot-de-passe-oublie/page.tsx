import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Mot de passe oublié | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function MotDePasseOubliePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Mot de passe oublié
      </h1>
      <p className="mt-2 text-ink-muted">
        Réinitialisation via Supabase Auth à venir (spec 14).
      </p>

      <form className="mt-8 flex flex-col gap-6">
        <Input label="Adresse e-mail" type="email" placeholder="vous@exemple.fr" />
        <Button variant="primary" size="lg" type="submit">
          Envoyer le lien de réinitialisation
        </Button>
      </form>
    </div>
  );
}
