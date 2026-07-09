import Link from "next/link";
import type { Metadata } from "next";
import { couleurToSlug, getGammes, getMembranes } from "@/lib/catalog/data";
import { withLivePricing } from "@/lib/catalog/live-pricing";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { capitalize } from "@/lib/utils/text";
import { ProPrice } from "@/components/pricing/pro-price";
import { ProductCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Membrane armée | Membranes Armées",
  description:
    "Membranes armées piscine par gamme : unies, imprimées. Rouleaux 41,25 m², pose par des professionnels qualifiés.",
  alternates: { canonical: "/membrane-armee" },
};

export default async function MembraneArmeeHubPage() {
  const gammes = getGammes();
  const membranes = await withLivePricing(getMembranes());

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Membrane armée
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Rouleaux de 41,25 m², déclinés par gamme et coloris. Chaque
          référence est vendue au mètre linéaire ou en rouleau complet.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        {gammes.map((gamme) => {
          const produits = membranes.filter((p) => p.gamme === gamme);
          return (
            <section key={gamme} className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-ink">
                  Gamme {capitalize(gamme)}
                </h2>
                <Link
                  href={`/membrane-armee/${gamme}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Voir toute la gamme
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {produits.map((produit) => (
                  <ProductCard
                    key={produit.slug}
                    href={`/membrane-armee/${gamme}/${couleurToSlug(produit.couleur as string)}`}
                    imageSrc={produit.image}
                    imageAlt={produit.name}
                    title={produit.name}
                    subtitle="Rouleau 41,25 m²"
                    badge={<Badge variant="in-stock">En stock</Badge>}
                    price={
                      <ProPrice
                        slug={produit.slug}
                        publicAmountCents={computePublicTtcCents(produit.base_price_ht, produit.vat_rate)}
                      />
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
