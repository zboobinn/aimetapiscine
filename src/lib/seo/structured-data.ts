import type { CatalogEntry } from "@/lib/catalog/schema";
import { absoluteUrl, SITE_BRAND } from "@/lib/seo/site-url";

/**
 * Constructeurs JSON-LD purs (18) : ne lisent QUE des valeurs déjà résolues
 * par l'appelant (prix TTC public déjà calculé via `computePublicTtcCents`,
 * même valeur que celle rendue dans le HTML ISR) — aucun recalcul de prix
 * ici, aucun accès réseau/DB.
 *
 * `sku` expose `produit.slug`, JAMAIS `produit.sku` (préfixé `APF-...`,
 * référence fournisseur interne) : le JSON-LD est dans le HTML public, donc
 * soumis au blind shipping (01) au même titre qu'un texte visible — même
 * règle déjà appliquée au champ « Référence » affiché sur la fiche produit
 * (decisions.md, 2026-07-07). Pas de `mpn` : c'est une référence fabricant
 * par définition, qu'on ne peut pas donner sans révéler le fournisseur, donc
 * on ne l'invente pas non plus.
 */

interface ProductJsonLdParams {
  produit: Pick<CatalogEntry, "slug" | "name" | "description" | "image" | "in_stock">;
  canonicalUrl: string;
  publicTtcCents: number;
  /** Doit correspondre au `revalidate` ISR de la page (18 — « Pièges »). */
  revalidateSeconds: number;
}

export function buildProductJsonLd({
  produit,
  canonicalUrl,
  publicTtcCents,
  revalidateSeconds,
}: ProductJsonLdParams) {
  const priceValidUntil = new Date(Date.now() + revalidateSeconds * 1000).toISOString();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonicalUrl,
    name: produit.name,
    description: produit.description,
    image: absoluteUrl(produit.image),
    sku: produit.slug,
    brand: { "@type": "Brand", name: SITE_BRAND },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "EUR",
      price: (publicTtcCents / 100).toFixed(2),
      availability: produit.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceValidUntil,
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_BRAND,
    url: absoluteUrl("/"),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_BRAND,
    url: absoluteUrl("/"),
  };
}
