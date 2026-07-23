import Link from "next/link";
import type { Metadata } from "next";
import { getAccessoryCategoryLabel, getAccessoryCategorySlug } from "@/lib/catalog/data";
import {
  FALLBACK_CATALOG_IMAGE,
  getLiveAccessoryProducts,
  getLiveAccessoryCategorySlugs,
  minActiveVariantPriceCents,
} from "@/lib/catalog/live-catalog";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ui/card";
import { ProPrice } from "@/components/pricing/pro-price";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Accessoires de pose | ArmaPool",
  description:
    "Feutre de protection, colles, PVC liquide, profilés et solvants pour la pose de membrane armée.",
  alternates: { canonical: "/accessoires" },
};

export default async function AccessoiresHubPage() {
  const [categorySlugs, accessories] = await Promise.all([
    getLiveAccessoryCategorySlugs(),
    getLiveAccessoryProducts(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Accessoires de pose
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Tout le nécessaire pour poser votre membrane armée dans les règles
          de l&apos;art.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        {categorySlugs.map((categorieSlug) => {
          const produits = accessories.filter(
            (produit) => getAccessoryCategorySlug(produit.category) === categorieSlug,
          );
          const label = getAccessoryCategoryLabel(produits[0]?.category ?? "");

          return (
            <section key={categorieSlug} className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-ink">
                  {label}
                </h2>
                <Link
                  href={`/accessoires/${categorieSlug}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Voir la catégorie
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {produits.map((produit) => {
                  const minPriceCents = minActiveVariantPriceCents(produit);
                  return (
                    <ProductCard
                      key={produit.slug}
                      href={`/accessoires/${categorieSlug}/${produit.slug}`}
                      imageSrc={produit.imageUrl ?? FALLBACK_CATALOG_IMAGE}
                      imageAlt={produit.name}
                      title={produit.name}
                      badge={<Badge variant="in-stock">En stock</Badge>}
                      price={
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-ink-muted">À partir de</span>
                          <ProPrice
                            slug={produit.slug}
                            publicAmountCents={computePublicTtcCents(minPriceCents, produit.vatRateBps)}
                          />
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
