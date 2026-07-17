import { z } from "zod";

import { couleurToSlug, getMembranes } from "@/lib/catalog/data";
import { capitalize } from "@/lib/utils/text";

/**
 * Manifeste des médias par coloris (annexe-brief-photo, 29/30). SEUL endroit
 * du projet qui connaît un chemin d'image produit — tout composant passe par
 * `resolvePoolMedia()`, jamais par un chemin en dur.
 *
 * Les clés sont les slugs de coloris du catalogue (`couleurToSlug`, déjà
 * utilisé par la fiche produit 07/14), pas une liste inventée ici : le
 * manifeste est dérivé de `getMembranes()` au chargement du module. Si deux
 * coloris différents produisaient le même slug, la donnée serait ambiguë
 * (quelles photos pour lequel ?) — `buildManifest()` throw plutôt que de
 * deviner (même philosophie que `catalogEntrySchema`, 27/D-critère "committé
 * = throw, jamais un repli silencieux").
 */

export const poolMediaPlanSchema = z.enum(["macro", "bassin", "echelle", "soudure"]);
export type PoolMediaPlan = z.infer<typeof poolMediaPlanSchema>;

const POOL_MEDIA_PLANS = poolMediaPlanSchema.options;

export const poolMediaPlanImageSchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
});
export type PoolMediaPlanImage = z.infer<typeof poolMediaPlanImageSchema>;

export const poolMediaEntrySchema = z.object({
  plans: z.object({
    macro: poolMediaPlanImageSchema,
    bassin: poolMediaPlanImageSchema,
    echelle: poolMediaPlanImageSchema,
    soudure: poolMediaPlanImageSchema,
  }),
  // Champ `water_appearance` (annexe-brief-photo) — texte provisoire tant que
  // `placeholder` vaut `true`. Passera en base (`products.water_appearance`)
  // en spec 29, pas ici (frontend-only, pas de migration).
  waterAppearance: z.string().min(1),
  placeholder: z.boolean(),
});
export type PoolMediaEntry = z.infer<typeof poolMediaEntrySchema>;

export const poolMediaManifestSchema = z.record(z.string(), poolMediaEntrySchema);
export type PoolMediaManifest = z.infer<typeof poolMediaManifestSchema>;

const PLACEHOLDER_DIR = "/media/placeholders";

// Ratios choisis pour éprouver le composant sur des formats différents (28) :
// le macro est le seul avec une contrainte dure (≥ 2000 px de large, brief).
const PLAN_DIMENSIONS: Record<PoolMediaPlan, { width: number; height: number }> = {
  macro: { width: 2000, height: 1333 },
  bassin: { width: 1920, height: 1280 },
  echelle: { width: 1200, height: 1600 },
  soudure: { width: 1600, height: 1200 },
};

const PLAN_ALT_SUFFIX: Record<PoolMediaPlan, string> = {
  macro: "grain de la matière (placeholder)",
  bassin: "bassin rempli — couleur de l'eau (placeholder)",
  echelle: "membrane avec repère de dimension (placeholder)",
  soudure: "détail d'un raccord soudé (placeholder)",
};

// Plan « bassin » : vraies photos (visuels TEMPORAIRES générés, à remplacer au
// shooting en lumière naturelle — annexe-brief-photo, A3). Dimensions réelles
// des fichiers = CLS 0. `placeholder` reste `true` : le brief exige 4 plans
// photographiés, ces 3 bassins n'en ferment aucun. Les plans macro/echelle/
// soudure restent des SVG neutres (PLAN_DIMENSIONS ci-dessus). Un coloris sans
// entrée ici retombe proprement sur le SVG `{coloris}-bassin.svg`.
const BASSIN_IMAGES: Record<string, { src: string; width: number; height: number }> = {
  bleu: { src: `${PLACEHOLDER_DIR}/bleu-bassin.jpg`, width: 2742, height: 1536 },
  "gris-anthracite": { src: `${PLACEHOLDER_DIR}/gris-anthracite-bassin.jpg`, width: 3114, height: 1376 },
  nuage: { src: `${PLACEHOLDER_DIR}/nuage-bassin.jpg`, width: 2742, height: 1536 },
};

function placeholderPlanImage(colorisSlug: string, plan: PoolMediaPlan, label: string): PoolMediaPlanImage {
  const real = plan === "bassin" ? BASSIN_IMAGES[colorisSlug] : undefined;
  const { src, width, height } = real ?? {
    src: `${PLACEHOLDER_DIR}/${colorisSlug}-${plan}.svg`,
    ...PLAN_DIMENSIONS[plan],
  };

  return {
    src,
    width,
    height,
    alt: `${label} — ${PLAN_ALT_SUFFIX[plan]}`,
  };
}

function buildManifest(): PoolMediaManifest {
  const manifest: PoolMediaManifest = {};
  // slug -> libellé couleur d'origine, pour détecter une collision entre deux
  // coloris distincts qui slugifieraient vers la même clé.
  const seenCouleurBySlug = new Map<string, string>();

  for (const produit of getMembranes()) {
    const couleur = produit.couleur;
    if (!couleur) continue; // garanti requis pour MEMBRANE par catalogEntrySchema

    const slug = couleurToSlug(couleur);
    const previousCouleur = seenCouleurBySlug.get(slug);

    if (previousCouleur !== undefined && previousCouleur !== couleur) {
      throw new Error(
        `[pool-media] slug de coloris "${slug}" ambigu : partagé entre "${previousCouleur}" et "${couleur}". ` +
          "Impossible de savoir quelles photos associer — à résoudre manuellement dans data/catalog.json avant de continuer.",
      );
    }
    seenCouleurBySlug.set(slug, couleur);

    if (manifest[slug]) continue; // déjà construit (même coloris, gamme différente déjà vérifiée ci-dessus)

    const label = capitalize(couleur);

    manifest[slug] = {
      plans: Object.fromEntries(
        POOL_MEDIA_PLANS.map((plan) => [plan, placeholderPlanImage(slug, plan, label)]),
      ) as PoolMediaEntry["plans"],
      waterAppearance:
        `${label} — la membrane est ${couleur}. ` +
        "L'eau paraît [PLACEHOLDER — texte provisoire, à rédiger depuis la vraie photo bassin, voir docs/annexe-brief-photo.md].",
      placeholder: true,
    };
  }

  return poolMediaManifestSchema.parse(manifest);
}

export const poolMediaManifest: PoolMediaManifest = buildManifest();

/** Point d'entrée STABLE et unique pour résoudre les médias d'un coloris. */
export function resolvePoolMedia(colorisSlug: string): PoolMediaEntry {
  const entry = poolMediaManifest[colorisSlug];

  if (!entry) {
    throw new Error(`[pool-media] coloris inconnu : "${colorisSlug}"`);
  }

  return entry;
}
