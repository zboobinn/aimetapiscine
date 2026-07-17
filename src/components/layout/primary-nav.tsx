"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavLinks } from "./nav-links";

/**
 * Nav centrée du header (look maquette, passe C). L'item actif est en
 * `--deep-blue` — JAMAIS `--turquoise`, réservé à la couleur du produit
 * (l'eau), jamais à un accent d'UI (D1, docs/decisions.md). Capitales via CSS
 * (`uppercase`), les libellés restent en casse naturelle dans `nav-links`
 * pour rester lisibles dans `MobileNav`.
 */
export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="hidden items-center justify-center gap-7 md:flex"
    >
      {primaryNavLinks.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className="text-[var(--step--1)] font-medium uppercase tracking-wide transition-colors"
            style={{ color: active ? "var(--deep-blue)" : "var(--ink)" }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
