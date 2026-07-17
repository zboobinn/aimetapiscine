import type { SwatchGroupOption } from "@/components/nuancier/swatch-group";
import { couleurToSlug, getMembranes } from "@/lib/catalog/data";
import { swatchColorFor } from "@/lib/catalog/swatch-color";
import { resolvePoolMedia } from "@/lib/media/pool-media";
import { capitalize } from "@/lib/utils/text";

/**
 * `waterAppearance` est résolu ICI (Server Component, `page.tsx`) et porté
 * en donnée plate — `Hero` (Client Component) ne doit jamais importer
 * `resolvePoolMedia()`/`getMembranes()` lui-même : ça embarquerait tout le
 * catalogue + son parsing Zod dans le bundle client pour une seule phrase.
 */
export interface HeroSwatchOption extends SwatchGroupOption {
  waterAppearance: string;
}

/**
 * Coloris du hero (30 §01) : un swatch par coloris DISTINCT du catalogue,
 * toutes gammes confondues — le visiteur du hero ne connaît pas encore les
 * gammes. Dédupliqué par slug, comme `resolvePoolMedia` (couture 29.0),
 * jamais une liste écrite à la main.
 */
export function buildHeroSwatchOptions(): HeroSwatchOption[] {
  const seenSlugs = new Set<string>();
  const options: HeroSwatchOption[] = [];

  for (const produit of getMembranes()) {
    const couleur = produit.couleur;
    if (!couleur) continue; // garanti requis pour MEMBRANE par catalogEntrySchema

    const slug = couleurToSlug(couleur);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const media = resolvePoolMedia(slug);
    options.push({
      id: slug,
      name: capitalize(couleur),
      color: swatchColorFor(couleur),
      image: { src: media.plans.bassin.src, alt: media.plans.bassin.alt },
      waterAppearance: media.waterAppearance,
    });
  }

  return options;
}
