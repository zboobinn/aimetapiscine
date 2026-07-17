import Link from "next/link";

const legalLinks = [
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  // Liens en dur (30 §10) : "Retours" et "Livraison" distincts, jamais fusionnés
  // en un seul libellé, chacun ancré sur sa section de /livraison-retours.
  { href: "/livraison-retours#livraison", label: "Livraison" },
  { href: "/livraison-retours#retours", label: "Retours" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="font-heading text-base font-semibold text-ink">
              ArmaPool
            </span>
            <p className="max-w-xs text-sm text-ink-muted">
              Membranes armées piscine et accessoires de pose, livrés en
              France métropolitaine.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-heading text-sm font-semibold text-ink">
              Boutique
            </span>
            <Link href="/membrane-armee" className="min-h-[44px] py-1 text-sm text-ink-muted hover:text-accent">
              Membrane armée
            </Link>
            <Link href="/accessoires" className="min-h-[44px] py-1 text-sm text-ink-muted hover:text-accent">
              Accessoires
            </Link>
            <Link href="/calculateur" className="min-h-[44px] py-1 text-sm text-ink-muted hover:text-accent">
              Calculateur
            </Link>
            <Link href="/guides" className="min-h-[44px] py-1 text-sm text-ink-muted hover:text-accent">
              Guides
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-heading text-sm font-semibold text-ink">
              Informations légales
            </span>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-[44px] py-1 text-sm text-ink-muted hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          © {new Date().getFullYear()} ArmaPool. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
