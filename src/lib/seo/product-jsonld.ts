import type { CatalogEntry } from "@/lib/catalog/schema";
import { assertBlindSafe, sanitizePublicField } from "@/lib/blind-shipping";
import { absoluteUrl, SITE_BRAND } from "@/lib/seo/site-url";

/**
 * Garde JSON-LD produit (27). `brand.name`/`seller.name` sont codés en dur
 * sur `SITE_BRAND` (déjà utilisé par `buildOrganizationJsonLd`/
 * `buildWebsiteJsonLd`, cohérence structurée sur un seul nom d'entité pour
 * tout le site) — ces champs ne prennent AUCUN argument, impossible de les
 * faire varier depuis l'appelant. Le type `ProductJsonLd` n'a pas d'index
 * signature : `manufacturer` n'existe pas dedans, l'ajouter est un échec de
 * compilation (excess property check sur un littéral typé), pas seulement un
 * échec de test à l'exécution.
 *
 * `name`/`description` passent par `sanitizePublicField` (régime « donnée
 * saisie ailleurs », D12/Amendement 4) avant d'entrer dans le JSON-LD — la
 * source actuelle (`data/catalog.json`) est déjà protégée en amont par le
 * régime « donnée commitée » (throw au chargement, `lib/catalog/schema.ts`),
 * donc cette sanitization ne devrait jamais se déclencher en pratique ; elle
 * reste la protection de premier niveau si ce champ est un jour alimenté par
 * une source éditable (Supabase, avis 31). `assertBlindSafe` sur la
 * sérialisation finale est la défense de dernier niveau (27) : si elle
 * throw, c'est qu'une autre garde a échoué ailleurs — mieux vaut casser le
 * rendu que fuiter en silence sur un contenu machine-lisible jamais audité
 * manuellement.
 */

interface ProductJsonLdInput {
  produit: Pick<CatalogEntry, "slug" | "name" | "description" | "image" | "in_stock">;
  canonicalUrl: string;
  publicTtcCents: number;
  /** Doit correspondre au `revalidate` ISR de la page (18 — « Pièges »). */
  revalidateSeconds: number;
}

interface ProductJsonLdOffer {
  "@type": "Offer";
  url: string;
  priceCurrency: "EUR";
  price: string;
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
  priceValidUntil: string;
}

interface ProductJsonLdBrand {
  "@type": "Brand";
  name: typeof SITE_BRAND;
}

interface ProductJsonLdSeller {
  "@type": "Organization";
  name: typeof SITE_BRAND;
}

/** Aucune index signature : `manufacturer` est inexprimable ici, par construction. */
export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  "@id": string;
  name: string;
  description: string;
  image: string;
  sku: string;
  brand: ProductJsonLdBrand;
  seller: ProductJsonLdSeller;
  offers: ProductJsonLdOffer;
}

export function buildProductJsonLd({
  produit,
  canonicalUrl,
  publicTtcCents,
  revalidateSeconds,
}: ProductJsonLdInput): ProductJsonLd {
  const priceValidUntil = new Date(Date.now() + revalidateSeconds * 1000).toISOString();

  const jsonLd: ProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonicalUrl,
    name: sanitizePublicField(produit.name, "product-jsonld-name", "Produit ArmaPool"),
    description: sanitizePublicField(
      produit.description ?? "",
      "product-jsonld-description",
      "Description indisponible.",
    ),
    image: absoluteUrl(produit.image),
    sku: produit.slug,
    brand: { "@type": "Brand", name: SITE_BRAND },
    seller: { "@type": "Organization", name: SITE_BRAND },
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

  assertBlindSafe(JSON.stringify(jsonLd), "product-jsonld-serialized");

  return jsonLd;
}
