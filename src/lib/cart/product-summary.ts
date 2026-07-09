/**
 * Résumé produit minimal transmis à un Client Component (23, decisions.md) :
 * JAMAIS la `CatalogEntry` complète, qui porte `sku` (préfixé `APF-...`,
 * référence fournisseur interne, 01) — celui-ci se retrouverait sérialisé
 * dans le payload RSC de chaque fiche produit. `publicTtcCents` est déjà
 * calculé par l'appelant (`computePublicTtcCents`) : aucun composant client
 * n'a besoin de `base_price_ht`/`vat_rate` bruts pour ce seul usage.
 */
export interface CartProductSummary {
  slug: string;
  name: string;
  inStock: boolean;
  publicTtcCents: number;
}

export function toCartProductSummary(
  product: { slug: string; name: string; in_stock: boolean },
  publicTtcCents: number,
): CartProductSummary {
  return {
    slug: product.slug,
    name: product.name,
    inStock: product.in_stock,
    publicTtcCents,
  };
}
