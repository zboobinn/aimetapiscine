import Link from "next/link";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";

interface ReassuranceItem {
  text: string;
  href?: string;
  linkLabel?: string;
}

// 39 % des abandons de panier viennent des frais annexes découverts trop tard
// (Baymard, docs/30-homepage.md §02) — répondre avant qu'on demande. Copie
// provisoire pour les items qui ne reprennent pas une donnée déjà affichée
// ailleurs sur le site (SHIPPING_DELAY_LABEL, 12, est le texte réel).
const REASSURANCE_ITEMS: ReassuranceItem[] = [
  { text: "Livraison incluse en France métropolitaine (copie provisoire — OK)" },
  { text: SHIPPING_DELAY_LABEL },
  // Correctif (30, rappel CLAUDE.md) : "fabricant" impliquait à tort une
  // fabrication propre — nous sommes distributeur, jamais fabricant.
  { text: "Garantie 10 ans (copie provisoire — OK)" },
  {
    text: "Retours simples (copie provisoire — OK)",
    href: "/livraison-retours",
    linkLabel: "voir les conditions",
  },
];

/** Barre de réassurance (30 §02) — 4 items texte, sans icônes, aucune animation. */
export function ReassuranceBar() {
  return (
    <section aria-label="Réassurance" style={{ borderBottom: "1px solid var(--coping)" }}>
      <ul
        className="mx-auto grid grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4"
        style={{ maxWidth: "var(--page-max)" }}
      >
        {REASSURANCE_ITEMS.map((item) => (
          <li key={item.text} className="text-[var(--step--1)]" style={{ color: "var(--ink)" }}>
            {item.text}
            {item.href ? (
              <>
                {" "}
                <Link href={item.href} className="underline" style={{ color: "var(--deep-blue)" }}>
                  {item.linkLabel}
                </Link>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
