/**
 * Types du panier (09). Aucune donnée de prix ici : une ligne ne référence
 * qu'un produit et une quantité, jamais un montant — les prix sont résolus
 * à l'affichage et au checkout côté serveur (23).
 *
 * `slug` (jamais `sku`) est l'identifiant produit qui quitte le serveur —
 * le SKU catalogue est préfixé `APF-...` (référence fournisseur interne, 01)
 * et ne doit apparaître nulle part côté client (23, decisions.md). Le
 * serveur retrouve le SKU réel par `slug` uniquement pour le BL fournisseur.
 */

export type CartLineSource = "catalog" | "pack";

export interface CartLine {
  slug: string;
  quantity: number;
  source: CartLineSource;
  /** Présent uniquement pour `source: "pack"` — regroupe les lignes d'un même pack calculateur (08). */
  packId?: string;
}

export interface CartPackMeta {
  /**
   * Query string du calculateur (`serializeCalculatorState`, 08) capturée au
   * moment de l'ajout : permet au lien « recalculer » de revenir exactement
   * au résultat qui a produit ce pack. Pas un prix, pas une quantité.
   */
  calculatorParams: string;
  /**
   * Slugs uniques du pack capturés à l'ajout (13) : permet de détecter qu'un
   * article a été retiré depuis, auquel cas la remise pack -5 % disparaît.
   * Envoyé au serveur (cart/resolve, checkout) au même titre que slug/quantity
   * — c'est une donnée structurelle du panier, pas un montant.
   */
  originalSlugs: string[];
}
