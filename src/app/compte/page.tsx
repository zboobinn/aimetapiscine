import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mon compte | Membranes Armées",
  robots: { index: false, follow: false },
};

const sections = [
  { title: "Profil", description: "Coordonnées et informations de contact." },
  { title: "Commandes", description: "Historique des commandes et suivi." },
  { title: "Factures", description: "Téléchargement des factures PDF." },
];

export default function ComptePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Mon compte
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Authentification Supabase à venir (spec 14). Coquille de navigation
          pour l&apos;instant.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex flex-col gap-2 rounded-lg border border-border p-6"
          >
            <h2 className="font-heading text-lg font-semibold text-ink">
              {section.title}
            </h2>
            <p className="text-sm text-ink-muted">{section.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-ink-muted">
        Compte professionnel ?{" "}
        <Link href="/compte/pro" className="font-medium text-accent hover:underline">
          Inscription / statut pro
        </Link>
      </p>
    </div>
  );
}
