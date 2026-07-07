export interface GuidePlaceholder {
  slug: string;
  title: string;
  excerpt: string;
}

/**
 * Placeholder — remplacé par le contenu MDX de `content/guides/` (spec 20).
 */
export const guides: GuidePlaceholder[] = [
  {
    slug: "choisir-sa-membrane-armee",
    title: "Comment choisir sa membrane armée",
    excerpt: "Gammes, coloris, épaisseurs : les critères pour bien choisir.",
  },
  {
    slug: "preparer-la-pose",
    title: "Préparer la pose de sa membrane",
    excerpt: "Feutre de protection, colle, outillage : la checklist avant pose.",
  },
];
