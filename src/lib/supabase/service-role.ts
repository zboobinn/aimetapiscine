import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Client `service_role` : contourne RLS. Réservé aux webhooks et scripts
 * serveur (23) — ne jamais importer depuis un composant ou du code exposé
 * au client.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
