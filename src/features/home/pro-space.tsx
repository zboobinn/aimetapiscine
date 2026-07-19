import Link from "next/link";
import { Bleed } from "@/components/nuancier/bleed";
import { HOME_RADIUS } from "./home-look";

/**
 * Espace pro (30 §08) — aucune animation. Le compte pro (SIRET, spec 14)
 * existe déjà : il ne se découvre pas dans le footer. Lien direct vers
 * `/compte/pro` (parcours pro complet, décision 2026-07-10), pas
 * `/inscription` (compte particulier). Panneau plein `--deep-blue`, d'après
 * la maquette (passe E) — pas de photo dédiée à ce jour (annexe-brief-photo
 * ne couvre pas ce module) : décor abstrait plutôt qu'un visuel de
 * substitution qui ferait croire à un asset livré.
 */
export function ProSpace() {
  return (
    <section aria-label="Espace professionnel">
      <Bleed>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ background: "var(--deep-blue)" }}>
          <div
            className="mx-auto flex w-full flex-col items-start gap-6 px-4 py-[var(--space-block)] sm:px-6 lg:mx-0 lg:px-12"
            style={{ maxWidth: "var(--page-max)" }}
          >
            <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--surface)" }}>
              Vous êtes professionnel ?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)", maxWidth: "var(--measure)", lineHeight: "var(--lh-body)" }}>
              Créez un compte pro, faites vérifier votre SIRET et accédez à des tarifs HT remisés.
              (copie provisoire — OK)
            </p>
            <Link
              href="/compte/pro"
              className="w-fit shrink-0 px-5 py-3 text-center font-medium"
              style={{ borderRadius: HOME_RADIUS, background: "var(--turquoise)", color: "var(--surface)" }}
            >
              Découvrir l&apos;espace pro →
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="hidden min-h-64 lg:block"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--turquoise) 35%, transparent), transparent 60%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.08), transparent 55%)",
            }}
          />
        </div>
      </Bleed>
    </section>
  );
}
