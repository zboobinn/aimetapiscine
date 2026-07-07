import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Client Supabase lié à la session de la requête courante (Server Components,
 * Route Handlers, Server Actions). Utilise `getUser()` pour toute décision
 * d'autorisation — jamais `getSession()` (non vérifié par le serveur Auth).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getSupabaseEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` appelé depuis un Server Component : ignoré si un
          // middleware se charge du rafraîchissement de session.
        }
      },
    },
  });
}
