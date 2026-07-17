import Link from "next/link";
import { PoolImage } from "@/components/media/pool-image";
import { couleurToSlug, getMembranes } from "@/lib/catalog/data";
import { capitalize } from "@/lib/utils/text";

const MAX_ITEMS = 6;
const STAGGER_STEP_MS = 60;

interface NuancierItem {
  id: string;
  gamme: string;
  couleurSlug: string;
  name: string;
  gammeLabel: string;
}

/**
 * Coloris DISTINCTS du catalogue (comme `buildHeroSwatchOptions`, 30 §01),
 * plafonné à 6 (30 §04) — pas une liste écrite à la main.
 */
function buildNuancierItems(): NuancierItem[] {
  const seenSlugs = new Set<string>();
  const items: NuancierItem[] = [];

  for (const produit of getMembranes()) {
    if (items.length >= MAX_ITEMS) break;

    const couleur = produit.couleur;
    const gamme = produit.gamme;
    if (!couleur || !gamme) continue; // garanti requis pour MEMBRANE par catalogEntrySchema

    const couleurSlug = couleurToSlug(couleur);
    if (seenSlugs.has(couleurSlug)) continue;
    seenSlugs.add(couleurSlug);

    items.push({
      id: couleurSlug,
      gamme,
      couleurSlug,
      name: capitalize(couleur),
      gammeLabel: capitalize(gamme),
    });
  }

  return items;
}

/**
 * Nuancier (30 §04) — seule section de la homepage avec reveal + stagger
 * 60 ms (D3 : état révélé par défaut, `.reveal` sous
 * `@supports (animation-timeline: view())`). Le geste signature (30 §Motion) :
 * macro au repos → bassin rempli au survol, crossfade CSS pur
 * (`.swatch-crossfade`, 120 ms), aucun JS. `group-focus` reprend le même
 * crossfade au clavier.
 */
export function Nuancier() {
  const items = buildNuancierItems();
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Nuancier"
      className="mx-auto w-full px-4 py-[var(--space-block)] sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
          Le nuancier
        </h2>
        <p style={{ color: "var(--ink-60)", maxWidth: "var(--measure)" }}>
          La matière au repos. Survolez un coloris pour voir le bassin rempli. (copie provisoire —
          OK)
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-3">
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={`/membrane-armee/${item.gamme}/${item.couleurSlug}`}
            className="reveal group relative block overflow-hidden border"
            style={{
              borderColor: "var(--coping)",
              borderRadius: "var(--radius)",
              animationDelay: `${index * STAGGER_STEP_MS}ms`,
            }}
          >
            <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
              <PoolImage
                colorisSlug={item.couleurSlug}
                plan="macro"
                className="h-full w-full object-cover"
              />
              <PoolImage
                colorisSlug={item.couleurSlug}
                plan="bassin"
                ariaHidden
                className="swatch-crossfade absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 group-focus:opacity-100"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <span style={{ color: "var(--ink)" }}>{item.name}</span>
              <span
                className="font-mono"
                style={{ fontSize: "var(--step--1)", color: "var(--ink-60)" }}
              >
                {item.gammeLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
