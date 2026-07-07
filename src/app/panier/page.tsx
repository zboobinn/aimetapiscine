import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Panier | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function PanierPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">Panier</h1>

      <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-12 text-center">
        <p className="max-w-sm text-ink-muted">
          Votre panier est vide pour le moment. Logique de panier à venir
          (spec 09).
        </p>
        <Link href="/membrane-armee">
          <Button variant="primary">Voir les membranes</Button>
        </Link>
      </div>
    </div>
  );
}
