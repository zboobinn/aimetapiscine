import Link from "next/link";

const boutiqueLinks = [
  { href: "/membrane-armee", label: "Membrane armée" },
  { href: "/accessoires", label: "Accessoires" },
  { href: "/calculateur", label: "Calculateur" },
  { href: "/guides", label: "Guides" },
  { href: "/compte/pro", label: "Espace pro" },
];

const legalLinks = [
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  // Liens en dur (30 §10) : "Retours" et "Livraison" distincts, jamais fusionnés
  // en un seul libellé, chacun ancré sur sa section de /livraison-retours.
  { href: "/livraison-retours#livraison", label: "Livraison" },
  { href: "/livraison-retours#retours", label: "Retours" },
  { href: "/contact", label: "Contact" },
];

/**
 * Logo inversé (30 §10) — recréé en markup local, PAS le PNG clair détouré
 * (`/brand/logo.png`, pensé pour un fond blanc) : sur `--deep-blue`, son
 * fond de calque clair produirait un rectangle visible. Même bouclier +
 * vague que l'asset (traits, pas de fond), en blanc/turquoise pour un fond
 * sombre. Recréé en SVG plutôt qu'un second fichier PNG : aucun outil
 * d'édition d'image disponible dans cette passe.
 */
function InvertedLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 3 34 8v11c0 9-6 15.5-14 18-8-2.5-14-9-14-18V8z"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M9 20c3-3 6-3 9 0s6 3 9 0"
          fill="none"
          stroke="var(--turquoise)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9 25c3-3 6-3 9 0s6 3 9 0"
          fill="none"
          stroke="var(--turquoise)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-lg font-bold">
          <span style={{ color: "var(--surface)" }}>Arma</span>
          <span style={{ color: "var(--turquoise)" }}>Pool</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
          Membranes armées sur mesure
        </span>
      </span>
    </div>
  );
}

function ChevronBullet() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="mt-1 shrink-0">
      <path d="m9 5 7 7-7 7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer style={{ background: "var(--deep-blue)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-4">
            <InvertedLogo />
            <p className="max-w-xs text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              Membranes armées piscine et accessoires de pose, livrés en France
              métropolitaine. L&apos;expertise du sur-mesure au service de votre bassin.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-heading text-sm font-semibold" style={{ color: "var(--surface)" }}>
              Boutique
            </span>
            {boutiqueLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-start gap-2 py-1 text-sm hover:text-(--turquoise)"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                <ChevronBullet />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-heading text-sm font-semibold" style={{ color: "var(--surface)" }}>
              Informations légales
            </span>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-start gap-2 py-1 text-sm hover:text-(--turquoise)"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                <ChevronBullet />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            © {new Date().getFullYear()} ArmaPool. Tous droits réservés.
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Conformément à la loi, en cas de litige non résolu avec notre service
            client, vous pouvez recourir gratuitement à un médiateur de la
            consommation.
          </p>
        </div>
      </div>
    </footer>
  );
}
