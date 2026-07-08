"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * État de connexion côté client, pour la nav (Header/MobileNav). Volontairement
 * séparé d'une lecture serveur (`getUser()` dans un Server Component) : le
 * Header est rendu par le layout racine sur TOUTE page, y compris les pages
 * ISR (07) — y lire les cookies de session forcerait un rendu dynamique et
 * casserait le cache. `null` = non authentifié, `undefined` = chargement.
 */
export function useAuthUser(): { email: string | null } | null | undefined {
  const [user, setUser] = useState<{ email: string | null } | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
