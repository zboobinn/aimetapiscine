import Link from "next/link";
import Image from "next/image";

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
            <Link href="/" className="flex w-fit items-center" aria-label="ArmaPool — accueil">
              <Image
                src="/brand/logo-blanc.png"
                alt="ArmaPool"
                width={623}
                height={90}
                className="h-12 w-auto"
              />
            </Link>
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
