import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ui/card";
import { ProPrice } from "@/components/pricing/pro-price";
import {
  getAccessoriesByCategorySlug,
  getAccessoryCategoryLabel,
  getAccessoryCategorySlugs,
} from "@/lib/catalog/data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ categorie: string }>;
}

export function generateStaticParams() {
  return getAccessoryCategorySlugs().map((categorie) => ({ categorie }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorie } = await params;
  const produits = getAccessoriesByCategorySlug(categorie);
  const label = getAccessoryCategoryLabel(produits[0]?.category ?? "");

  return {
    title: `${label} | Accessoires | Membranes Armées`,
    description: `${label} pour la pose de membrane armée piscine.`,
  };
}

export default async function AccessoireCategoriePage({ params }: PageProps) {
  const { categorie } = await params;
  const produits = getAccessoriesByCategorySlug(categorie);

  if (produits.length === 0) {
    notFound();
  }

  const label = getAccessoryCategoryLabel(produits[0].category);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/accessoires", label: "Accessoires" },
            { href: `/accessoires/${categorie}`, label },
          ]}
        />
      </div>

      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">{label}</h1>
        <p className="max-w-2xl text-ink-muted">
          {produits.length} référence{produits.length > 1 ? "s" : ""} disponible
          {produits.length > 1 ? "s" : ""}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {produits.map((produit) => (
          <ProductCard
            key={produit.sku}
            href={`/accessoires/${categorie}/${produit.slug}`}
            imageSrc={produit.image}
            imageAlt={produit.name}
            title={produit.name}
            badge={<Badge variant="in-stock">En stock</Badge>}
            price={<ProPrice sku={produit.sku} publicAmountCents={produit.base_price_ht} />}
          />
        ))}
      </div>
    </div>
  );
}
