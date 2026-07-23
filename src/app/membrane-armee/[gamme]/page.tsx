import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ui/card";
import { ProPrice } from "@/components/pricing/pro-price";
import { couleurToSlug } from "@/lib/catalog/data";
import {
  FALLBACK_CATALOG_IMAGE,
  formatColorisLabel,
  getLiveMembraneProductBySlug,
  getLiveMembraneProducts,
} from "@/lib/catalog/live-catalog";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ gamme: string }>;
}

export async function generateStaticParams() {
  const gammes = await getLiveMembraneProducts();
  return gammes.map((gamme) => ({ gamme: gamme.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gamme } = await params;
  const produit = await getLiveMembraneProductBySlug(gamme);

  return {
    title: `${produit?.name ?? "Membrane armée"} | ArmaPool`,
    description: `Coloris disponibles pour ${produit?.name ?? "cette gamme"} de membrane armée.`,
    alternates: { canonical: `/membrane-armee/${gamme}` },
  };
}

export default async function GammePage({ params }: PageProps) {
  const { gamme } = await params;
  const produit = await getLiveMembraneProductBySlug(gamme);

  if (!produit) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Accueil", url: "/" },
          { name: "Membrane armée", url: "/membrane-armee" },
          { name: produit.name, url: `/membrane-armee/${gamme}` },
        ])}
      />
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/membrane-armee", label: "Membrane armée" },
            { href: `/membrane-armee/${gamme}`, label: produit.name },
          ]}
        />
      </div>

      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">{produit.name}</h1>
        <p className="max-w-2xl text-ink-muted">
          {produit.variants.length} coloris disponible{produit.variants.length > 1 ? "s" : ""}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {produit.variants.map((variant) => {
          const couleurSlug = variant.coloris ? couleurToSlug(variant.coloris) : variant.id;
          return (
            <ProductCard
              key={variant.id}
              href={`/membrane-armee/${gamme}/${couleurSlug}`}
              imageSrc={produit.imageUrl ?? FALLBACK_CATALOG_IMAGE}
              imageAlt={variant.coloris ?? produit.name}
              title={variant.coloris ? formatColorisLabel(variant.coloris) : produit.name}
              badge={<Badge variant="in-stock">En stock</Badge>}
              price={
                <ProPrice
                  slug={`${gamme}-${couleurSlug}`}
                  publicAmountCents={computePublicTtcCents(variant.basePriceHtCents, produit.vatRateBps)}
                />
              }
            />
          );
        })}
      </div>
    </div>
  );
}
