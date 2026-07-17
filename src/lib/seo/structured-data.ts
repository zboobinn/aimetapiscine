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

/**
 * FAQPage (30 §09) — pas d'`AggregateRating` ici ni ailleurs sur le site
 * (décision 2026-07-07, 18 gagne sur toute mention contraire de la spec 30).
 * Le texte doit correspondre EXACTEMENT au contenu affiché (exigence Google) :
 * l'appelant doit passer la MÊME source que le rendu visuel, jamais une copie
 * réécrite pour le balisage.
 */
export function buildFaqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
