import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { CatalogEntry } from "./schema";

interface LiveProductPricingRow {
  sku: string;
  base_price_ht: number;
  pro_price_ht: number | null;
  vat_rate: number;
  in_stock: boolean;
}

/**
 * Client anonyme SANS session (pas de `cookies()`/`headers()`) : sûr à
 * appeler depuis une page ISR (07) sans forcer son rendu dynamique — ne lit
 * que des lignes publiques (`products_select_active`, `is_active = true`,
 * 03), jamais utilisé pour une écriture.
 */
function createPublicCatalogClient() {
  const env = getSupabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function fetchLivePricingBySkus(skus: string[]): Promise<Map<string, LiveProductPricingRow>> {
  if (skus.length === 0) return new Map();

  const supabase = createPublicCatalogClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, base_price_ht, pro_price_ht, vat_rate, in_stock")
    .in("sku", skus)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Lecture des prix produits (Supabase) échouée : ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.sku, row as LiveProductPricingRow]));
}

/**
 * Fusionne le prix LIVE de `public.products` (modifiable dans Supabase
 * Studio, sans redéploiement, 26) sur des entrées structurelles de
 * `data/catalog.json` (nom, images, coverage — 04, jamais dupliqué en DB
 * pour l'instant). Un SKU absent en DB (import pas encore lancé) garde son
 * prix de catalogue en repli, pour ne jamais casser l'affichage.
 *
 * Point d'entrée UNIQUE utilisé par toutes les pages produit et par les
 * routes de tarification (`/api/cart/resolve`, `/api/checkout`,
 * `/api/pricing/product-price`) avant tout calcul de prix (14).
 */
export async function withLivePricing<T extends CatalogEntry>(entries: T[]): Promise<T[]> {
  const pricingBySku = await fetchLivePricingBySkus(entries.map((entry) => entry.sku));

  return entries.map((entry) => {
    const live = pricingBySku.get(entry.sku);
    if (!live) return entry;

    return {
      ...entry,
      base_price_ht: live.base_price_ht,
      pro_price_ht: live.pro_price_ht,
      vat_rate: live.vat_rate,
      in_stock: live.in_stock,
    };
  });
}

export async function withLivePricingOne<T extends CatalogEntry>(entry: T): Promise<T>;
export async function withLivePricingOne<T extends CatalogEntry>(
  entry: T | undefined,
): Promise<T | undefined>;
export async function withLivePricingOne<T extends CatalogEntry>(
  entry: T | undefined,
): Promise<T | undefined> {
  if (!entry) return undefined;
  const [merged] = await withLivePricing([entry]);
  return merged;
}
