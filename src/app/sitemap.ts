import type { MetadataRoute } from "next";
import { guides } from "@/app/guides/guides-data";
import {
  couleurToSlug,
  getAccessories,
  getAccessoryCategorySlug,
  getAccessoryCategorySlugs,
  getGammes,
  getMembranes,
} from "@/lib/catalog/data";
import { absoluteUrl } from "@/lib/seo/site-url";

/**
 * Pages statiques indexables uniquement — exclut explicitement /compte/**,
 * /panier, /connexion, /inscription, /mot-de-passe-oublie,
 * /mettre-a-jour-mot-de-passe, /commande/confirmation, /design-system,
 * /simulateur-3d (18, decisions.md) : toutes en `noindex`, ou stub sans
 * contenu pour /design-system et /simulateur-3d.
 */
const STATIC_PAGES: MetadataRoute.Sitemap[number][] = [
  { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
  { url: absoluteUrl("/membrane-armee"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteUrl("/accessoires"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteUrl("/calculateur"), changeFrequency: "monthly", priority: 0.8 },
  { url: absoluteUrl("/guides"), changeFrequency: "weekly", priority: 0.6 },
  { url: absoluteUrl("/cgv"), changeFrequency: "yearly", priority: 0.2 },
  { url: absoluteUrl("/confidentialite"), changeFrequency: "yearly", priority: 0.2 },
  { url: absoluteUrl("/mentions-legales"), changeFrequency: "yearly", priority: 0.2 },
  { url: absoluteUrl("/livraison-retours"), changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const membraneGammes: MetadataRoute.Sitemap = getGammes().map((gamme) => ({
    url: absoluteUrl(`/membrane-armee/${gamme}`),
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const membraneFiches: MetadataRoute.Sitemap = getMembranes().map((produit) => ({
    url: absoluteUrl(`/membrane-armee/${produit.gamme}/${couleurToSlug(produit.couleur as string)}`),
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const accessoryCategories: MetadataRoute.Sitemap = getAccessoryCategorySlugs().map((categorie) => ({
    url: absoluteUrl(`/accessoires/${categorie}`),
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const accessoryFiches: MetadataRoute.Sitemap = getAccessories().map((produit) => ({
    url: absoluteUrl(`/accessoires/${getAccessoryCategorySlug(produit.category)}/${produit.slug}`),
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: absoluteUrl(`/guides/${guide.slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...STATIC_PAGES.map((page) => ({ ...page, lastModified })),
    ...membraneGammes,
    ...membraneFiches,
    ...accessoryCategories,
    ...accessoryFiches,
    ...guidePages,
  ];
}
