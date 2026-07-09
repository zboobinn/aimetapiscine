import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProPrice } from "@/components/pricing/pro-price";
import { getCompatibleAccessories } from "@/features/cart";
import {
  couleurToSlug,
  getAccessories,
  getMembraneByGammeAndCouleur,
  getMembranes,
} from "@/lib/catalog/data";
import { withLivePricing, withLivePricingOne } from "@/lib/catalog/live-pricing";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/seo/structured-data";
import { capitalize } from "@/lib/utils/text";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ gamme: string; couleur: string }>;
}

export function generateStaticParams() {
  return getMembranes().map((produit) => ({
    gamme: produit.gamme as string,
    couleur: couleurToSlug(produit.couleur as string),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gamme, couleur } = await params;
  const produit = getMembraneByGammeAndCouleur(gamme, couleur);

  if (!produit) {
    return { title: "Produit introuvable | Membranes Armées" };
  }

  return {
    title: `${produit.name} | Membranes Armées`,
    description: produit.description,
    alternates: { canonical: `/membrane-armee/${gamme}/${couleur}` },
  };
}

export default async function MembraneFichePage({ params }: PageProps) {
  const { gamme, couleur } = await params;
  const produitCatalogue = getMembraneByGammeAndCouleur(gamme, couleur);

  if (!produitCatalogue) {
    notFound();
  }

  const produit = await withLivePricingOne(produitCatalogue);
  const compatibleAccessories = await withLivePricing(getCompatibleAccessories(getAccessories()));
  const canonicalUrl = absoluteUrl(`/membrane-armee/${gamme}/${couleur}`);
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
          { name: "Membrane armée", url: "/membrane-armee" },
          { name: capitalize(gamme), url: `/membrane-armee/${gamme}` },
          { name: capitalize(produit.couleur as string), url: `/membrane-armee/${gamme}/${couleur}` },
        ])}
      />
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/membrane-armee", label: "Membrane armée" },
            { href: `/membrane-armee/${gamme}`, label: capitalize(gamme) },
            { href: `/membrane-armee/${gamme}/${couleur}`, label: capitalize(produit.couleur as string) },
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
            sku={produit.sku}
            publicAmountCents={publicTtcCents}
            size="lg"
          />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-6 text-sm">
            <dt className="text-ink-muted">Référence</dt>
            <dd className="text-ink">{produit.slug}</dd>
            <dt className="text-ink-muted">Surface au rouleau</dt>
            <dd className="text-ink">{produit.roll_area_m2} m²</dd>
            <dt className="text-ink-muted">Poids</dt>
            <dd className="text-ink">{(produit.weight_grams / 1000).toFixed(1)} kg</dd>
            <dt className="text-ink-muted">Conditionnement</dt>
            <dd className="text-ink">{produit.unit}</dd>
          </dl>

          <AddToCartButton product={produit} compatibleAccessories={compatibleAccessories} />

          <Link href="/calculateur">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Utiliser le calculateur
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
