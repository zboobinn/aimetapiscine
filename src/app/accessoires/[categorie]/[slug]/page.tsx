import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProPrice } from "@/components/pricing/pro-price";
import {
  getAccessories,
  getAccessoryBySlug,
  getAccessoryCategoryLabel,
  getAccessoryCategorySlug,
} from "@/lib/catalog/data";
import { withLivePricingOne } from "@/lib/catalog/live-pricing";
import { toCartProductSummary } from "@/lib/cart/product-summary";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { buildProductJsonLd } from "@/lib/seo/product-jsonld";
import { JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ categorie: string; slug: string }>;
}

export function generateStaticParams() {
  return getAccessories().map((produit) => ({
    categorie: getAccessoryCategorySlug(produit.category),
    slug: produit.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorie, slug } = await params;
  const produit = getAccessoryBySlug(categorie, slug);

  if (!produit) {
    return { title: "Produit introuvable | Membranes Armées" };
  }

  return {
    title: `${produit.name} | Membranes Armées`,
    description: produit.description,
    alternates: { canonical: `/accessoires/${categorie}/${slug}` },
  };
}

export default async function AccessoireFichePage({ params }: PageProps) {
  const { categorie, slug } = await params;
  const produitCatalogue = getAccessoryBySlug(categorie, slug);

  if (!produitCatalogue) {
    notFound();
  }

  const produit = await withLivePricingOne(produitCatalogue);
  const label = getAccessoryCategoryLabel(produit.category);
  const canonicalUrl = absoluteUrl(`/accessoires/${categorie}/${slug}`);
  const publicTtcCents = computePublicTtcCents(produit.base_price_ht, produit.vat_rate);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd
        data={buildProductJsonLd({
          produit,
          canonicalUrl,
          publicTtcCents,
          revalidateSeconds: revalidate,
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Accueil", url: "/" },
          { name: "Accessoires", url: "/accessoires" },
          { name: label, url: `/accessoires/${categorie}` },
          { name: produit.name, url: `/accessoires/${categorie}/${slug}` },
        ])}
      />
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/accessoires", label: "Accessoires" },
            { href: `/accessoires/${categorie}`, label },
            { href: `/accessoires/${categorie}/${slug}`, label: produit.name },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface">
          <Image
            src={produit.image}
            alt={produit.name}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Badge variant="in-stock" className="w-fit">
              En stock
            </Badge>
            <h1 className="font-heading text-3xl font-semibold text-ink">
              {produit.name}
            </h1>
            <p className="text-ink-muted">{produit.description}</p>
          </div>

          <ProPrice
            slug={produit.slug}
            publicAmountCents={publicTtcCents}
            size="lg"
          />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-6 text-sm">
            <dt className="text-ink-muted">Référence</dt>
            <dd className="text-ink">{produit.slug}</dd>
            <dt className="text-ink-muted">Poids</dt>
            <dd className="text-ink">{(produit.weight_grams / 1000).toFixed(1)} kg</dd>
            <dt className="text-ink-muted">Conditionnement</dt>
            <dd className="text-ink">{produit.unit}</dd>
          </dl>

          <AddToCartButton product={toCartProductSummary(produit, publicTtcCents)} />
        </div>
      </div>
    </div>
  );
}
