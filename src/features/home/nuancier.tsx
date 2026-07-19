import { couleurToSlug, getMembranes } from "@/lib/catalog/data";
import { resolvePoolMedia } from "@/lib/media/pool-media";
import { capitalize } from "@/lib/utils/text";
import { NuancierCard } from "./nuancier-card";

const MAX_ITEMS = 6;
const STAGGER_STEP_MS = 60;

interface NuancierItem {
  id: string;
  gamme: string;
  couleurSlug: string;
  name: string;
  gammeLabel: string;
  waterAppearance: string;
}

/**
 * Coloris DISTINCTS du catalogue (comme `buildHeroSwatchOptions`, 30 §01),
 * plafonné à 6 (30 §04) — pas une liste écrite à la main. `waterAppearance`
 * résolu ICI (Server Component) via `resolvePoolMedia()`, jamais depuis
 * `NuancierCard` (Client Component) — même règle que `hero-swatch-options.ts`.
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
      waterAppearance: resolvePoolMedia(couleurSlug).waterAppearance,
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
          La matière au repos. Touchez ou survolez un coloris pour voir le bassin rempli.
          (copie provisoire — OK)
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-3">
        {items.map((item, index) => (
          <NuancierCard
            key={item.id}
            href={`/membrane-armee/${item.gamme}/${item.couleurSlug}`}
            couleurSlug={item.couleurSlug}
            name={item.name}
            gammeLabel={item.gammeLabel}
            waterAppearance={item.waterAppearance}
            animationDelayMs={index * STAGGER_STEP_MS}
          />
        ))}
      </div>
    </section>
  );
}
