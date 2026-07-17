import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ProSignupForm } from "./pro-signup-form";

export const metadata: Metadata = {
  title: "Compte professionnel | ArmaPool",
  robots: { index: false, follow: false },
};

type ProfileRow = {
  role: "USER" | "PRO_PENDING" | "PRO_VERIFIED";
  siret: string | null;
  company_name: string | null;
};

export default async function ComptePropage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, siret, company_name")
        .eq("id", user.id)
        .single<ProfileRow>()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Compte professionnel
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Tarifs HT remisés réservés aux professionnels vérifiés.
        </p>
      </header>

      {!user ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6 text-sm text-ink-muted">
          <p>Connectez-vous d&apos;abord pour faire une demande de compte pro.</p>
          <Link
            href="/connexion"
            className="self-start rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      ) : profile?.role === "PRO_VERIFIED" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-6">
          <Badge variant="in-stock" className="w-fit">
            Compte professionnel vérifié
          </Badge>
          <p className="text-sm text-ink-muted">
            {profile.company_name} — SIRET {profile.siret} — les prix HT remisés
            s&apos;appliquent désormais sur tout le site.
          </p>
        </div>
      ) : profile?.role === "PRO_PENDING" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-6">
          <Badge variant="promo" className="w-fit">
            Compte professionnel en cours de vérification
          </Badge>
          <p className="text-sm text-ink-muted">
            {profile.company_name} — SIRET {profile.siret}. Vous voyez pour
            l&apos;instant les prix publics TTC ; les prix HT remisés
            s&apos;activeront une fois votre SIRET vérifié.
          </p>
        </div>
      ) : (
        <ProSignupForm />
      )}
    </div>
  );
}
