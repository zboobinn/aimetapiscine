import type { Metadata } from "next";
import {
  FALLBACK_CATALOG_IMAGE,
  getLiveMembraneProducts,
  minActiveVariantPriceCents,
} from "@/lib/catalog/live-catalog";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { ProPrice } from "@/components/pricing/pro-price";
import { ProductCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Membrane armée | ArmaPool",
  description:
    "Membranes armées piscine par gamme : unies, imprimées. Rouleaux, pose par des professionnels qualifiés.",
  alternates: { canonical: "/membrane-armee" },
};

export default async function MembraneArmeeHubPage() {
  const gammes = await getLiveMembraneProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Membrane armée
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Déclinées par gamme et coloris. Chaque référence est vendue au
          rouleau.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {gammes.map((gamme) => {
          const minPriceCents = minActiveVariantPriceCents(gamme);
          return (
            <ProductCard
              key={gamme.slug}
              href={`/membrane-armee/${gamme.slug}`}
              imageSrc={gamme.imageUrl ?? FALLBACK_CATALOG_IMAGE}
              imageAlt={gamme.name}
              title={gamme.name}
              subtitle={`${gamme.variants.length} coloris`}
              badge={<Badge variant="in-stock">En stock</Badge>}
              price={
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ink-muted">À partir de</span>
                  <ProPrice
                    slug={gamme.slug}
                    publicAmountCents={computePublicTtcCents(minPriceCents, gamme.vatRateBps)}
                  />
                </div>
              }
            />
          );
        })}
      </div>

      {gammes.length === 0 ? (
        <p className="text-ink-muted">Aucune gamme disponible pour le moment.</p>
      ) : null}
    </div>
  );
}
