import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceEnv } from "@/lib/env";

/**
 * Client `service_role` : contourne RLS. Réservé aux webhooks et scripts
 * serveur (23) — ne jamais importer depuis un composant ou du code exposé
 * au client.
 *
 * Réservé au runtime Next.js (le `server-only` ci-dessus le garantit). Un
 * script hors-Next (ex. `scripts/import-catalog.ts`) ne doit PAS importer ce
 * module : il doit recréer son propre client à partir de
 * `getSupabaseServiceEnv()`.
 */
export function createServiceRoleClient() {
  const env = getSupabaseServiceEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
