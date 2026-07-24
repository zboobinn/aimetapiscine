import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Prix pro live, réservé au `service_role` (23) : `pro_price_ht` vit sur
 * `product_variants` (migration `20260720000200_product_variants.sql`,
 * tranche 2) — plus sur `products` — et n'est plus lisible via la clé anon
 * pour aucune des deux tables (privilège de colonne). Une même `products.sku`
 * pouvant désormais porter plusieurs variantes à des prix différents
 * (coloris × largeur × conditionnement), la clé de lookup est forcément
 * `variantId`, jamais `sku` (l'ancien paramètre aurait résolu le prix d'UNE
 * variante arbitraire du produit, pas celle réellement au panier).
 *
 * Appelée uniquement par `resolveProUnitHtCents()`
 * (`lib/pricing/resolve-price.ts`), elle-même appelée uniquement quand le
 * rôle résolu est "b2b" — jamais sur le chemin de rendu ISR public.
 */
export async function fetchLiveProPriceHtCents(variantId: string): Promise<number | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("pro_price_ht")
    .eq("id", variantId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Lecture pro_price_ht (service_role) échouée : ${error.message}`);
  }

  return data?.pro_price_ht ?? null;
}
