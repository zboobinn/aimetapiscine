import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Compte professionnel | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function ComptePropage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Compte professionnel
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Vérification SIRET à venir (spec 14) pour débloquer les tarifs HT
          remisés.
        </p>
      </header>

      <form className="flex flex-col gap-6">
        <Input label="Raison sociale" placeholder="Ma société SARL" />
        <Input label="SIRET" placeholder="123 456 789 00012" hint="14 chiffres" />
        <Button variant="primary" size="lg" type="submit" className="self-start">
          Envoyer ma demande
        </Button>
      </form>
    </div>
  );
}
