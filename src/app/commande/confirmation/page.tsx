import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Confirmation de commande | Membranes Armées",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ConfirmationCommandePage({ searchParams }: PageProps) {
  await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">
        Merci pour votre commande
      </h1>
      <p className="max-w-md text-ink-muted">
        Lecture de la session de paiement Stripe à venir (spec 10/11). Un
        e-mail de confirmation vous sera envoyé.
      </p>
      <Link href="/">
        <Button variant="primary">Retour à l&apos;accueil</Button>
      </Link>
    </div>
  );
}
