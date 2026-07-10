import { absoluteUrl, SITE_BRAND } from "@/lib/seo/site-url";

/**
 * Constructeurs JSON-LD purs (18) : ne lisent QUE des valeurs déjà résolues
 * par l'appelant — aucun recalcul de prix ici, aucun accès réseau/DB.
 *
 * `buildProductJsonLd` a été déplacé dans `lib/seo/product-jsonld.ts` (27) —
 * garde blind-shipping dédiée (brand/seller figés, `manufacturer`
 * inexprimable dans le type). Ne pas le redupliquer ici.
 */

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
