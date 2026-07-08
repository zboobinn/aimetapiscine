import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PricingRole } from "./types";

/**
 * Résout le rôle tarifaire de la requête courante à partir de `profiles.role`
 * lu EN DB (14) — jamais depuis un état client. Seul un profil `PRO_VERIFIED`
 * (bascule manuelle via Supabase Studio, jamais automatique) reçoit "b2b".
 * Point d'entrée UNIQUE de la résolution de rôle : le reste du panier/checkout
 * ne doit jamais être retouché pour ça.
 */
export async function resolvePricingRole(): Promise<PricingRole> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "b2c";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "USER" | "PRO_PENDING" | "PRO_VERIFIED" }>();

  return profile?.role === "PRO_VERIFIED" ? "b2b" : "b2c";
}
