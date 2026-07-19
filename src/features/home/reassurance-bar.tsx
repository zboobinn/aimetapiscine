import type { ReactNode } from "react";
import Link from "next/link";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";
import { PackageIcon, ShieldCheckIcon, TruckIcon, UndoIcon } from "./home-icons";
import { HOME_RADIUS, HOME_SHADOW } from "./home-look";

interface ReassuranceItem {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  linkLabel?: string;
}

/**
 * 39 % des abandons de panier viennent des frais annexes découverts trop tard
 * (Baymard, docs/30-homepage.md §02) — répondre avant qu'on demande.
 *
 * Correctif passe E (rappel CLAUDE.md/12) : "Livraison incluse" retiré — le
 * port est facturé (mode `included`/`flat`, surcoût Corse systématique, 12) ;
 * "Retours simples" retiré — la découpe sur mesure n'est pas reprise par
 * défaut (14 FAQ, `NEXT_PUBLIC_REMAKE_GUARANTEE`).
 */
const REASSURANCE_ITEMS: ReassuranceItem[] = [
  {
    icon: <TruckIcon />,
    title: "Livraison en France métropolitaine",
    subtitle: "Frais calculés à l'étape panier",
  },
  {
    icon: <PackageIcon />,
    title: "Expédition rapide",
    subtitle: SHIPPING_DELAY_LABEL,
  },
  {
    icon: <ShieldCheckIcon />,
    title: "Garantie 10 ans (copie provisoire — OK)",
    subtitle: "Étanchéité certifiée (copie provisoire — OK)",
  },
  {
    icon: <UndoIcon />,
    title: "Découpe sur mesure",
    subtitle: "Non reprise en cas d'erreur de cote",
    href: "/livraison-retours#retours",
    linkLabel: "voir les conditions",
  },
];

/** Barre de réassurance (30 §02) — bandeau compact, carte unique, aucune animation. */
export function ReassuranceBar() {
  return (
    <section
      aria-label="Réassurance"
      className="mx-auto w-full px-4 py-8 sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <ul
        className="grid grid-cols-1 gap-0 border lg:grid-cols-4"
        style={{
          borderColor: "var(--coping)",
          borderRadius: HOME_RADIUS,
          boxShadow: HOME_SHADOW,
          background: "var(--surface)",
        }}
      >
        {REASSURANCE_ITEMS.map((item, index) => (
          <li
            key={item.title}
            className={`flex items-start gap-3 p-5 ${index > 0 ? "border-t lg:border-t-0 lg:border-l" : ""}`}
            style={{ borderColor: "var(--coping)" }}
          >
            <span aria-hidden="true" style={{ color: "var(--turquoise)" }}>
              {item.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium" style={{ color: "var(--ink)" }}>
                {item.title}
              </span>
              <span className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {item.subtitle}
                {item.href ? (
                  <>
                    {" "}
                    <Link href={item.href} className="underline" style={{ color: "var(--deep-blue)" }}>
                      {item.linkLabel}
                    </Link>
                  </>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
