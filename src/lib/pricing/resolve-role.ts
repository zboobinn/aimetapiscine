import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PricingRole } from "./types";

/**
 * Résout le rôle tarifaire de la requête courante. V1 : aucun compte pro
 * vérifié n'existe encore côté panier, donc tout utilisateur (anonyme ou
 * connecté) reçoit "b2c" (prix public TTC). Le branchement complet — lire
 * `profiles.role` en DB et retourner "b2b" si `PRO_VERIFIED` (14) — se fait
 * uniquement ici : le reste du panier ne doit jamais être retouché.
 */
export async function resolvePricingRole(): Promise<PricingRole> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "b2c";

  // TODO (14) : lire profiles.role pour ce user et retourner "b2b" si PRO_VERIFIED.
  return "b2c";
}
