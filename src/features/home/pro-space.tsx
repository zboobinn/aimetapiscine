import Link from "next/link";

/**
 * Espace pro (30 §08) — aucune animation. Le compte pro (SIRET, spec 14)
 * existe déjà : il ne se découvre pas dans le footer. Lien direct vers
 * `/compte/pro` (parcours pro complet, décision 2026-07-10), pas
 * `/inscription` (compte particulier).
 */
export function ProSpace() {
  return (
    <section
      aria-label="Espace professionnel"
      className="border-t"
      style={{ borderColor: "var(--coping)" }}
    >
      <div
        className="mx-auto flex flex-col gap-6 px-4 py-[var(--space-block)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
        style={{ maxWidth: "var(--page-max)" }}
      >
        <div className="flex flex-col gap-2">
          <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
            Vous êtes professionnel ?
          </h2>
          <p style={{ color: "var(--ink-60)", maxWidth: "var(--measure)" }}>
            Créez un compte pro, faites vérifier votre SIRET et accédez à des tarifs HT remisés.
            (copie provisoire — OK)
          </p>
        </div>
        <Link
          href="/compte/pro"
          className="w-fit shrink-0 border px-5 py-3 text-center font-medium"
          style={{ borderColor: "var(--ink)", borderRadius: "var(--radius)", color: "var(--ink)" }}
        >
          Découvrir l&apos;espace pro →
        </Link>
      </div>
    </section>
  );
}
