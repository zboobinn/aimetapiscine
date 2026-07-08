"use client";

import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function AuthNav() {
  const user = useAuthUser();

  if (user === undefined) {
    return (
      <Link
        href="/compte"
        className="flex min-h-[44px] items-center rounded-md px-3 font-medium text-ink hover:bg-surface hover:text-accent"
      >
        Mon compte
      </Link>
    );
  }

  if (user === null) {
    return (
      <Link
        href="/connexion"
        className="flex min-h-[44px] items-center rounded-md px-3 font-medium text-ink hover:bg-surface hover:text-accent"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/compte"
        className="flex min-h-[44px] items-center rounded-md px-3 font-medium text-ink hover:bg-surface hover:text-accent"
      >
        Mon compte
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-surface hover:text-accent"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
