import Link from "next/link";
import { AuthNav } from "./auth-nav";
import { MobileNav } from "./mobile-nav";
import { primaryNavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-ink"
        >
          Membranes Armées
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {primaryNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-ink hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <AuthNav />
          <Link
            href="/panier"
            className="flex min-h-[44px] items-center rounded-md bg-accent-surface px-4 font-medium text-accent hover:bg-accent hover:text-white"
          >
            Panier
          </Link>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
