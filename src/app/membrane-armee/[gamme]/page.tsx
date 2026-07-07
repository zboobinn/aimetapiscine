import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { couleurToSlug, getGammes, getMembranesByGamme } from "@/lib/catalog/data";
import { capitalize } from "@/lib/utils/text";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ gamme: string }>;
}

export function generateStaticParams() {
  return getGammes().map((gamme) => ({ gamme }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gamme } = await params;
  return {
    title: `Membrane armée — Gamme ${capitalize(gamme)} | Membranes Armées`,
    description: `Coloris disponibles dans la gamme ${gamme} de membranes armées, rouleaux 41,25 m².`,
  };
}

export default async function GammePage({ params }: PageProps) {
  const { gamme } = await params;
  const produits = getMembranesByGamme(gamme);

  if (produits.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/membrane-armee", label: "Membrane armée" },
            { href: `/membrane-armee/${gamme}`, label: capitalize(gamme) },
          ]}
        />
      </div>

      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Gamme {capitalize(gamme)}
        </h1>
        <p className="max-w-2xl text-ink-muted">
          {produits.length} coloris disponibles, rouleau de 41,25 m².
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {produits.map((produit) => (
          <ProductCard
            key={produit.sku}
            href={`/membrane-armee/${gamme}/${couleurToSlug(produit.couleur as string)}`}
            imageSrc={produit.image}
            imageAlt={produit.name}
            title={produit.name}
            subtitle={capitalize(produit.couleur as string)}
            badge={<Badge variant="in-stock">En stock</Badge>}
            price={<Price amountCents={produit.base_price_ht} role="b2c" />}
          />
        ))}
      </div>
    </div>
  );
}
