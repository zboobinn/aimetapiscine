import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Réglages boutique modifiables sans redéploiement (table `store_settings`,
 * migration `20260711000000_store_settings.sql`) : clé/valeur `jsonb`, prêt
 * pour une future interface admin sans changer ces fonctions (26). La TVA
 * (20 %, `STANDARD_VAT_RATE_BPS`) n'est JAMAIS exposée ici — contrainte
 * légale fixe, hors de portée de ce réglage éditable.
 */

const PRO_DISCOUNT_KEY = "pro_discount_bps";

// Basis points (0-10000, ex. 1000 = 10 %) : même unité que `discount_bps` (13).
const proDiscountValueSchema = z.number().int().min(0).max(10000);

/**
 * Pourcentage de remise pro globale, appliqué à `base_price_ht` pour les
 * produits SANS `pro_price_ht` spécifique (14, `lib/pricing/resolve-price.ts`).
 * Lu avec le client lié à la session (RLS : réservé aux utilisateurs
 * authentifiés, 03) — jamais depuis le client anonyme. Aucune ligne trouvée
 * (réglage jamais initialisé) : repli à 0 (pas de remise) plutôt qu'une
 * erreur, pour ne jamais bloquer un checkout.
 */
export async function getProDiscountBps(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", PRO_DISCOUNT_KEY)
    .maybeSingle();

  if (error || !data) return 0;

  const parsed = proDiscountValueSchema.safeParse(data.value);
  return parsed.success ? parsed.data : 0;
}

/**
 * Écriture réservée au service_role (RLS, 03) : appelée depuis un script ou,
 * plus tard, la route d'une interface admin — jamais depuis du code exposé
 * au client.
 */
export async function setProDiscountBps(bps: number): Promise<void> {
  const value = proDiscountValueSchema.parse(bps);
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("store_settings")
    .upsert({ key: PRO_DISCOUNT_KEY, value, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(`Écriture store_settings (${PRO_DISCOUNT_KEY}) échouée : ${error.message}`);
  }
}
