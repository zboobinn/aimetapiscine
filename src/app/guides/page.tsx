import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "./guides-data";

export const metadata: Metadata = {
  title: "Guides | ArmaPool",
  description: "Conseils et guides pratiques pour choisir et poser votre membrane armée.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">Guides</h1>
        <p className="max-w-2xl text-ink-muted">
          Conseils pratiques pour bien choisir et poser votre membrane armée.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-border p-6 transition-shadow hover:shadow-soft"
          >
            <h2 className="font-heading text-lg font-semibold text-ink">
              {guide.title}
            </h2>
            <p className="text-sm text-ink-muted">{guide.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
