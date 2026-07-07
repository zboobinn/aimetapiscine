import { z } from "zod";

/**
 * Schéma du fichier pivot `data/catalog.json` (04). Toute entrée invalide
 * annule l'import complet — pas d'import partiel.
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
    pro_price_ht: z.number().int().nonnegative(),
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
