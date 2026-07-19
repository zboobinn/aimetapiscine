import type { ReactNode } from "react";
import Link from "next/link";
import { getRemakeGuaranteeCopy } from "@/features/pdp/remake-guarantee-copy";
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
 *
 * Le sous-titre « Expédition rapide » reprend la même donnée de délai que
 * `SHIPPING_DELAY_LABEL` (5 à 10 jours ouvrés, cf. faq-data.ts) mais dans une
 * forme raccourcie, sans la mention « notre partenaire logistique » — trop
 * long pour un bandeau une-ligne compact ; ce n'est pas une seconde source,
 * juste une reformulation courte du même délai réel.
 */
const REASSURANCE_ITEMS: ReassuranceItem[] = [
  {
    icon: <TruckIcon />,
    title: "Livraison France métropolitaine",
    subtitle: "Frais calculés à l'étape panier",
  },
  {
    icon: <PackageIcon />,
    title: "Expédition rapide",
    subtitle: "Sous 5 à 10 jours ouvrés",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "Garantie 10 ans",
    subtitle: "Sur la membrane",
  },
];

/**
 * 4ᵉ item « Découpe sur mesure » (29 §8, A1) — copie pilotée par
 * `NEXT_PUBLIC_REMAKE_GUARANTEE`, ACCÈS LITTÉRAL dans ce fichier (piège spec
 * 28, 28a) : `material-only`/`full` réutilisent la formulation canonique de
 * `getRemakeGuaranteeCopy` (jamais une deuxième version qui pourrait
 * diverger de la PDP/FAQ) ; toute autre valeur (`off` par défaut) affiche le
 * texte de repli ci-dessous, propre à ce bandeau, avec un lien vers les
 * conditions.
 */
function buildRemakeGuaranteeItem(): ReassuranceItem {
  const rawValue = process.env.NEXT_PUBLIC_REMAKE_GUARANTEE;
  if (rawValue === "material-only" || rawValue === "full") {
    return {
      icon: <UndoIcon />,
      title: "Découpe sur mesure",
      subtitle: getRemakeGuaranteeCopy(rawValue),
    };
  }
  return {
    icon: <UndoIcon />,
    title: "Découpe sur mesure",
    subtitle: "Non reprise en cas d'erreur de cote",
    href: "/livraison-retours#retours",
    linkLabel: "voir conditions",
  };
}

/** 1 = pas de séparateur vertical mobile ; 2/3 séparés par une ligne + colonne. */
const BORDER_CLASSES = [
  "",
  "border-l",
  "border-t lg:border-t-0 lg:border-l",
  "border-l border-t lg:border-t-0",
];

/**
 * Barre de réassurance (30 §02) — bandeau compact, une seule rangée en
 * desktop, collé bord à bord sous le hero (aucun espace, aucun overlap,
 * coins supérieurs non arrondis : la carte commence exactement où le hero
 * s'arrête).
 */
export function ReassuranceBar() {
  const items = [...REASSURANCE_ITEMS, buildRemakeGuaranteeItem()];

  return (
    <section aria-label="Réassurance" className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: "var(--page-max)" }}>
      <ul
        className="grid grid-cols-2 gap-0 border lg:grid-cols-4"
        style={{
          borderColor: "var(--coping)",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: HOME_RADIUS,
          borderBottomRightRadius: HOME_RADIUS,
          boxShadow: HOME_SHADOW,
          background: "var(--surface)",
        }}
      >
        {items.map((item, index) => (
          <li
            key={item.title}
            className={`flex items-start gap-3 px-4 py-3.5 lg:px-5 ${BORDER_CLASSES[index]}`}
            style={{ borderColor: "var(--coping)" }}
          >
            <span aria-hidden="true" className="shrink-0" style={{ color: "var(--turquoise)" }}>
              {item.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-bold lg:truncate" style={{ color: "var(--deep-blue)" }}>
                {item.title}
              </span>
              <span className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {item.subtitle}
                {item.href ? (
                  <>
                    {" — "}
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
