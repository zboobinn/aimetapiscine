"use client";

import Link from "next/link";
import { useState } from "react";
import { primaryNavLinks } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-surface"
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
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="fixed inset-x-0 top-[64px] z-40 border-b border-border bg-background shadow-soft"
        >
          <nav className="flex flex-col gap-1 px-6 py-4">
            {primaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center rounded-md px-2 font-medium text-ink hover:bg-surface hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-border" />
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 font-medium text-ink hover:bg-surface hover:text-accent"
            >
              Mon compte
            </Link>
            <Link
              href="/panier"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 font-medium text-ink hover:bg-surface hover:text-accent"
            >
              Panier
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
