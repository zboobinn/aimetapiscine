import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { guides } from "../guides-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);

  if (!guide) {
    return { title: "Guide introuvable | Membranes Armées" };
  }

  return {
    title: `${guide.title} | Guides | Membranes Armées`,
    description: guide.excerpt,
    alternates: { canonical: `/guides/${slug}` },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/guides", label: "Guides" },
            { href: `/guides/${slug}`, label: guide.title },
          ]}
        />
      </div>

      <article className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          {guide.title}
        </h1>
        <p className="text-ink-muted">{guide.excerpt}</p>
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-ink-muted">
          Contenu MDX à venir (spec 20).
        </div>
      </article>
    </div>
  );
}
