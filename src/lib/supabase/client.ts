import { createBrowserClient } from "@supabase/ssr";

/**
 * Next.js n'inline les variables `NEXT_PUBLIC_*` dans le bundle navigateur
 * QUE pour les expressions littérales `process.env.NEXT_PUBLIC_X` trouvées
 * statiquement dans le code — jamais pour un objet `process.env` entier
 * passé à une fonction (`getSupabaseEnv()`/Zod, 26). Ces deux constantes
 * doivent donc rester des accès directs et littéraux ICI, jamais déléguées
 * au domaine `lib/env` partagé (qui reste correct côté serveur, où
 * `process.env` est le vrai objet runtime).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes côté navigateur.",
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
