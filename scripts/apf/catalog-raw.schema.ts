import { z } from "zod";

/**
 * Schéma du parse brut de la grille tarifaire APF (data/apf/catalog-raw.json).
 * Artefact intermédiaire server-only : contient des tokens fournisseur bruts
 * (HYDROFLEX, POOL DESIGN, ALKORPLAN, RENOLIT, APF...), c'est le parse fidèle
 * de la source. Étanchéité blind-shipping (01) appliquée sur la sortie
 * FAÇADE ultérieure, pas ici.
 */
export const catalogRawRecordSchema = z.object({
  ref_apf: z.string().min(1),
  designation_brute: z.string().min(1),
  famille_brute: z.string().min(1),
  largeur_m: z.number().positive().nullable(),
  longueur_rouleau_m: z.number().positive().nullable(),
  unite: z.enum(["m2", "ml", "unite"]),
  prix_public_ht_cents: z.number().int().nonnegative().nullable(),
  epaisseur_raw: z.string().nullable(),
  coloris_candidat: z.string().nullable(),
  warnings: z.array(z.string()),
});

export type CatalogRawRecord = z.infer<typeof catalogRawRecordSchema>;

export const catalogRawFileSchema = z.array(catalogRawRecordSchema);
