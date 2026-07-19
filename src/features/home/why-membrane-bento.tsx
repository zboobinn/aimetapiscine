import type { ReactNode } from "react";
import { BroomIcon, FlameIcon, LayersIcon, RulerIcon, SparkleIcon } from "./home-icons";
import { HOME_RADIUS, HOME_SHADOW } from "./home-look";

interface BentoItem {
  icon: ReactNode;
  title: string;
  body: string;
  /** Cellule d'ouverture, sur 2 colonnes en desktop — seule asymétrie du bento. */
  lead?: boolean;
}

const BENTO_ITEMS: BentoItem[] = [
  {
    icon: <RulerIcon />,
    title: "Sur mesure",
    body: "Chaque membrane est calculée pour votre bassin — pas une taille standard. (copie provisoire — OK)",
    lead: true,
  },
  {
    icon: <LayersIcon />,
    title: "Armature",
    body: "Une armature tissée pensée pour encaisser les variations thermiques et la pression de l'eau. (copie provisoire — OK)",
  },
  {
    icon: <SparkleIcon />,
    title: "Finition",
    body: "Un vernis anti-UV et anti-algues pour une eau claire toute la saison. (copie provisoire — OK)",
  },
  {
    icon: <FlameIcon />,
    title: "Pose soudée",
    body: "Lés soudés à chaud, sans colle sur les joints structurels. (copie provisoire — OK)",
  },
  {
    icon: <BroomIcon />,
    title: "Entretien simple",
    body: "Un brossage régulier suffit à préserver l'aspect de la membrane. (copie provisoire — OK)",
  },
];

/**
 * Bento « Pourquoi une membrane armée » (30 §07) — reveal. Seul endroit du
 * site où le bento est justifié : des faits hétérogènes de même niveau (28).
 * Une fois, pas deux. Zéro stagger ici (30 ne le demande que pour le
 * nuancier, §04) — le bento révèle en bloc.
 */
export function WhyMembraneBento() {
  return (
    <section
      aria-label="Pourquoi une membrane armée"
      className="mx-auto w-full px-4 py-[var(--space-block)] sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
        Pourquoi une membrane armée
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENTO_ITEMS.map((item) => (
          <div
            key={item.title}
            className={`reveal flex flex-col gap-3 border p-6 ${item.lead ? "lg:col-span-2" : ""}`}
            style={{
              borderColor: "var(--coping)",
              borderRadius: HOME_RADIUS,
              boxShadow: HOME_SHADOW,
              background: "var(--surface)",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--turquoise)" }}>
              {item.icon}
            </span>
            <h3 className="font-display" style={{ fontSize: "var(--step-1)" }}>
              {item.title}
            </h3>
            <p style={{ color: "var(--ink-60)", lineHeight: "var(--lh-body)" }}>{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
