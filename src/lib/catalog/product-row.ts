import type { CatalogEntry } from "./schema";

/**
 * Forme d'une ligne `public.products` (03) dérivée d'une entrée catalogue —
 * utilisée par `scripts/import-catalog.ts` (upsert) ET testée directement
 * (`src/lib/cart/blind-shipping.test.ts`) pour garantir qu'aucune colonne
 * autre que `sku` ne peut porter de référence fournisseur.
 */
export interface ProductRow {
  sku: string;
  slug: string;
  name: string;
  category: CatalogEntry["category"];
  description: string | null;
  image_url: string;
  base_price_ht: number;
  pro_price_ht: number | null;
  vat_rate: number;
  weight_grams: number;
  roll_area_m2: number | null;
  coverage: CatalogEntry["coverage"];
  in_stock: boolean;
  is_active: boolean;
}

/**
 * `image_url` est TOUJOURS dérivé de `slug`, jamais copié depuis
 * `product.image` (23) : la colonne DB est protégée par une contrainte CHECK
 * interdisant toute référence fournisseur
 * (`products_image_url_no_supplier_ref`, migration
 * `20260713100000_products_no_supplier_ref.sql`) — dériver ici plutôt que
 * copier la source rend cette garantie indépendante de ce que `catalog.json`
 * (ou un futur import CSV APF) contient réellement dans son champ `image`.
 */
export function toProductRow(product: CatalogEntry, isActive = true): ProductRow {
  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description ?? null,
    image_url: `/products/${product.slug}.jpg`,
    base_price_ht: product.base_price_ht,
    pro_price_ht: product.pro_price_ht,
    vat_rate: product.vat_rate,
    weight_grams: product.weight_grams,
    roll_area_m2: product.roll_area_m2,
    coverage: product.coverage,
    in_stock: product.in_stock,
    is_active: isActive,
  };
}
