import Link from "next/link";
import Image from "next/image";
import { AuthNav } from "./auth-nav";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6">
        {/* Logo à gauche. Dimensions intrinsèques réelles du fichier (322×82)
            pour un aspect-ratio figé → CLS = 0 ; la taille affichée est pilotée
            par la classe (`h-11 w-auto`). `priority` : au-dessus de la flottaison. */}
        <Link href="/" className="flex items-center" aria-label="ArmaPool — accueil">
          <Image
            src="/brand/logo-bleu.png"
            alt="ArmaPool"
            width={322}
            height={82}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <PrimaryNav />

        <div className="flex items-center justify-end gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <AuthNav />
            <Link
              href="/panier"
              aria-label="Panier"
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:text-(--deep-blue)"
            >
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
                  d="M6 8h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8z"
                  strokeLinejoin="round"
                />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </Link>
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
