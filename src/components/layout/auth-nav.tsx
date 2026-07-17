"use client";

import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

/** Icône compte (SVG inline, aucune dépendance d'icônes — look maquette, passe C). */
function AccountIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

const iconLinkClass =
  "flex h-11 w-11 items-center justify-center rounded-md text-ink hover:text-(--deep-blue)";

export function AuthNav() {
  const user = useAuthUser();

  // État de chargement : cible /compte par défaut (comportement inchangé).
  if (user === undefined) {
    return (
      <Link href="/compte" aria-label="Mon compte" className={iconLinkClass}>
        <AccountIcon />
      </Link>
    );
  }

  if (user === null) {
    return (
      <Link href="/connexion" aria-label="Connexion" className={iconLinkClass}>
        <AccountIcon />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link href="/compte" aria-label="Mon compte" className={iconLinkClass}>
        <AccountIcon />
      </Link>
      <form action={signOutAction}>
        <button type="submit" aria-label="Déconnexion" className={iconLinkClass}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path
              d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 12H3m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}
