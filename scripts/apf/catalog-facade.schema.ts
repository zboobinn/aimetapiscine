import { z } from "zod";

/**
 * Schéma de la sortie façade (data/apf/catalog-facade.json) — étape 3 de la
 * couche d'identité produit. Artefact intermédiaire server-only : `ref_apf`
 * y est délibérément conservé (server-only) mais ne doit JAMAIS être exposé
 * dans un champ client. Aucun champ de ce schéma ne doit contenir de token
 * fournisseur (HYDROFLEX, ALKORPLAN, RENOLIT, POOL DESIGN, APF) — vérifié par
 * tests/catalog-facade-blind-shipping.spec.ts, pas par ce schéma.
 */
export const catalogFacadeVarianteSchema = z.object({
  coloris: z.string().nullable(),
  largeur_m: z.number().positive().nullable(),
  longueur_rouleau_m: z.number().positive().nullable(),
  prix_public_ht_cents: z.number().int().nonnegative().nullable(),
  ref_apf: z.string().min(1),
});

export const catalogFacadeProduitSchema = z.object({
  slug: z.string().min(1),
  nom_affiche: z.string().min(1),
  type: z.enum(["membrane", "pvc-liquide", "accessoire"]),
  unite: z.enum(["m2", "ml", "unite"]),
  statut: z.enum(["publie", "brouillon"]),
  variantes: z.array(catalogFacadeVarianteSchema).min(1),
});

export type CatalogFacadeVariante = z.infer<typeof catalogFacadeVarianteSchema>;
export type CatalogFacadeProduit = z.infer<typeof catalogFacadeProduitSchema>;

export const catalogFacadeFileSchema = z.array(catalogFacadeProduitSchema);
