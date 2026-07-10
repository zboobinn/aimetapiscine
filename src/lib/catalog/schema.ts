import { z } from "zod";

import { containsForbiddenToken } from "@/lib/blind-shipping";

/**
 * Schéma du fichier pivot `data/catalog.json` (04). Toute entrée invalide
 * annule l'import complet — pas d'import partiel.
 *
 * Régime « donnée à nous, commitée » (27, D12/Amendement 4) : `catalog.json`
 * est mirroré sur GitHub, un token fournisseur qui y atterrit est déjà fuité
 * dans l'historique git avant même d'atteindre un navigateur. Contrairement
 * aux champs saisis ailleurs (`sanitizePublicField`, repli + log), une
 * détection ici est un bug de développeur : elle doit THROW et casser
 * `next build`/le chargement du catalogue, jamais un repli silencieux.
 */

export const productCategorySchema = z.enum([
  "MEMBRANE",
  "FEUTRE",
  "COLLE",
  "PVC_LIQUIDE",
  "PROFIL",
  "SOLVANT",
  "AUTRE",
]);

export const catalogUnitSchema = z.enum(["rouleau", "bidon", "barre", "unite", "cartouche"]);

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug : minuscules, chiffres et tirets uniquement");

export const catalogEntrySchema = z
  .object({
    sku: z.string().min(1),
    // Stable dès la création (SEO, 04/18) : jamais régénéré par le script d'import.
    slug: slugSchema,
    name: z.string().min(1),
    category: productCategorySchema,
    // Uniquement pour les membranes (gamme × couleur = un SKU, 04).
    gamme: z.string().min(1).optional(),
    couleur: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    base_price_ht: z.number().int().nonnegative(),
    // null : pas de prix pro spécifique — le pourcentage global de
    // `store_settings` (13/14, `lib/store-settings.ts`) s'applique alors sur
    // `base_price_ht` pour résoudre le prix pro.
    pro_price_ht: z.number().int().nonnegative().nullable(),
    vat_rate: z.number().int().min(0).max(10000),
    weight_grams: z.number().int().positive(),
    // 41,25 m² pour les membranes ; null pour les accessoires (03).
    roll_area_m2: z.number().positive().nullable(),
    unit: catalogUnitSchema,
    // Rendements calculateur (08) : jamais codés en dur, uniquement ici.
    coverage: z.record(z.string(), z.number().positive()).nullable(),
    image: z.string().min(1),
    in_stock: z.boolean().default(true),
  })
  .superRefine((entry, ctx) => {
    const blindShippingFields: [string, string | undefined][] = [
      ["name", entry.name],
      ["description", entry.description],
      ["gamme", entry.gamme],
      ["couleur", entry.couleur],
    ];

    for (const [field, value] of blindShippingFields) {
      if (value !== undefined && containsForbiddenToken(value)) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          // Message générique (23/27) : jamais le contenu fautif ni le token.
          message: "contenu bloqué par le garde-fou blind shipping (catalogue committé, 27)",
        });
      }
    }

    if (entry.category === "MEMBRANE") {
      if (!entry.gamme) {
        ctx.addIssue({ code: "custom", path: ["gamme"], message: "requis pour une membrane" });
      }
      if (!entry.couleur) {
        ctx.addIssue({ code: "custom", path: ["couleur"], message: "requis pour une membrane" });
      }
      if (entry.roll_area_m2 === null) {
        ctx.addIssue({
          code: "custom",
          path: ["roll_area_m2"],
          message: "requis pour une membrane",
        });
      }
      if (entry.coverage !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["coverage"],
          message: "doit être null pour une membrane (roll_area_m2 suffit)",
        });
      }
    } else {
      if (entry.coverage === null) {
        ctx.addIssue({
          code: "custom",
          path: ["coverage"],
          message: "requis pour un accessoire (rendement calculateur, 08)",
        });
      }
      if (entry.roll_area_m2 !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["roll_area_m2"],
          message: "doit être null hors membrane",
        });
      }
    }
  });

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export const catalogFileSchema = z.object({
  note: z.string().min(1),
  products: z
    .array(catalogEntrySchema)
    .min(1)
    .superRefine((products, ctx) => {
      const skus = new Set<string>();
      const slugs = new Set<string>();

      products.forEach((product, index) => {
        if (skus.has(product.sku)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "sku"],
            message: `sku dupliqué : ${product.sku}`,
          });
        }
        skus.add(product.sku);

        if (slugs.has(product.slug)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "slug"],
            message: `slug dupliqué : ${product.slug}`,
          });
        }
        slugs.add(product.slug);
      });
    }),
});

export type CatalogFile = z.infer<typeof catalogFileSchema>;
