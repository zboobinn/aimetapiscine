import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Cible de `emailRedirectTo`/`redirectTo` (signUp, resetPasswordForEmail —
 * 14). Fonctionne avec les gabarits d'email Supabase Auth PAR DÉFAUT (lien
 * `{{ .ConfirmationURL }}` non personnalisé — la personnalisation en
 * français est verrouillée tant que le SMTP custom Resend, 17, n'est pas
 * configuré) : Supabase vérifie le token côté GoTrue puis redirige le
 * navigateur ici avec `?code=...` (flux PKCE, activé par défaut par
 * `@supabase/ssr` côté client ET serveur). On échange ce code contre une
 * session via `exchangeCodeForSession`, qui pose les cookies de session —
 * cette route sert donc À LA FOIS la confirmation d'inscription ET la
 * réinitialisation de mot de passe, `next` seul distingue la destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/compte";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirect(next);
    }
  }

  redirect("/connexion?erreur=lien_invalide");
}
