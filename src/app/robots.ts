import type { MetadataRoute } from "next";
import { getSiteEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo/site-url";

/**
 * Tant que `SEO_ALLOW_INDEXING` n'est pas explicitement "true" (défaut
 * false), on bloque tout — pas une heuristique sur NEXT_PUBLIC_SITE_URL, un
 * flag dédié (18, decisions.md) pour ne jamais indexer une URL de
 * preview/staging par erreur.
 */
export default function robots(): MetadataRoute.Robots {
  const { SEO_ALLOW_INDEXING } = getSiteEnv();

  if (!SEO_ALLOW_INDEXING) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/compte",
        "/panier",
        "/connexion",
        "/inscription",
        "/mot-de-passe-oublie",
        "/mettre-a-jour-mot-de-passe",
        "/commande/confirmation",
        "/design-system",
        "/simulateur-3d",
        "/auth",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
