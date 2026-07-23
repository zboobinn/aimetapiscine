import "server-only";

import { createClient } from "@supabase/supabase-js";

import { sanitizePublicField } from "@/lib/blind-shipping";
import { couleurToSlug, getAccessoryCategorySlug } from "@/lib/catalog/data";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Lecture publique du catalogue réel — `products` JOIN `product_variants`
 * (migration `20260720000200_product_variants.sql`). Remplace, pour les 6
 * pages catalogue/PDP (hub/gamme/fiche membrane, hub/catégorie/fiche
 * accessoire) UNIQUEMENT, l'ancien pipeline `data/catalog.json` +
 * `live-pricing.ts` (qui lit encore des colonnes supprimées de `products`).
 * Panier, checkout, `/api/pricing/product-price` et le calculateur PDP
 * gardent l'ancien pipeline pour l'instant (tranches suivantes,
 * docs/decisions.md).
 *
 * SELECT explicite, jamais `*` : `ref_apf` et `pro_price_ht` ne sont même pas
 * demandés (23/27) — le privilège de colonne (migration
 * `20260720000200_product_variants.sql`) les bloquerait de toute façon pour
 * la clé anon, mais l'intention doit rester lisible ici aussi.
 */

export type LiveProductCategory =
  | "MEMBRANE"
  | "FEUTRE"
  | "COLLE"
  | "PVC_LIQUIDE"
  | "PROFIL"
  | "SOLVANT"
  | "AUTRE";

const ACCESSORY_CATEGORIES: LiveProductCategory[] = [
  "FEUTRE",
  "COLLE",
  "PVC_LIQUIDE",
  "PROFIL",
  "SOLVANT",
  "AUTRE",
];

export interface LiveVariant {
  id: string;
  coloris: string | null;
  largeurM: number | null;
  longueurRouleauM: number | null;
  rollAreaM2: number | null;
  basePriceHtCents: number;
  weightGrams: number;
  coverage: Record<string, number> | null;
  inStock: boolean;
}

export interface LiveProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: LiveProductCategory;
  description: string | null;
  imageUrl: string | null;
  vatRateBps: number;
  /** Variantes ACTIVES uniquement (03 : is_active = false = variante retirée) — jamais toutes les lignes brutes. */
  variants: LiveVariant[];
}

interface RawVariantRow {
  id: string;
  coloris: string | null;
  largeur_m: number | null;
  longueur_rouleau_m: number | null;
  roll_area_m2: number | null;
  base_price_ht: number;
  weight_grams: number;
  coverage: Record<string, number> | null;
  in_stock: boolean;
  is_active: boolean;
}

interface RawProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: LiveProductCategory;
  description: string | null;
  image_url: string | null;
  vat_rate: number;
  statut: "publie" | "brouillon";
  is_active: boolean;
  product_variants: RawVariantRow[];
}

/**
 * `ref_apf` et `pro_price_ht` absents à dessein (23/27) — jamais un
 * `select("*")` sur un chemin public (03/15). `product_variants!inner(...)`
 * exclut un produit dont AUCUNE variante ne matche le filtre `is_active`
 * ci-dessous (PostgREST : un filtre sur une ressource imbriquée exige
 * `!inner` pour agir comme condition d'exclusion, pas seulement de tri).
 */
export const CATALOG_SELECT_COLUMNS =
  "id, sku, name, slug, category, description, image_url, vat_rate, statut, is_active, " +
  "product_variants!inner(id, coloris, largeur_m, longueur_rouleau_m, roll_area_m2, base_price_ht, weight_grams, coverage, in_stock, is_active)";

function createPublicCatalogClient() {
  const env = getSupabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Filtre/façonnage PUR et testable, en plus des filtres `.eq()` côté requête
 * (même logique « RLS + filtre explicite » que le reste du projet, 03) :
 * défense en profondeur, pas une redite inutile. Retourne `null` pour un
 * produit brouillon/désactivé ou dont plus aucune variante n'est vendable —
 * jamais un produit sans prix affichable.
 */
export function shapeLiveProduct(row: RawProductRow): LiveProduct | null {
  if (row.statut !== "publie" || !row.is_active) return null;

  const activeVariants = row.product_variants.filter((variant) => variant.is_active);
  if (activeVariants.length === 0) return null;

  return {
    id: row.id,
    sku: row.sku,
    name: sanitizePublicField(row.name, `live-catalog:${row.slug}.name`, "Produit ArmaPool"),
    slug: row.slug,
    category: row.category,
    description: row.description,
    imageUrl: row.image_url,
    vatRateBps: row.vat_rate,
    variants: activeVariants.map((variant) => ({
      id: variant.id,
      coloris:
        variant.coloris === null
          ? null
          : sanitizePublicField(variant.coloris, `live-catalog:${row.slug}.coloris`, "Coloris"),
      largeurM: variant.largeur_m,
      longueurRouleauM: variant.longueur_rouleau_m,
      rollAreaM2: variant.roll_area_m2,
      basePriceHtCents: variant.base_price_ht,
      weightGrams: variant.weight_grams,
      coverage: variant.coverage,
      inStock: variant.in_stock,
    })),
  };
}

/** Prix « à partir de » (hub/liste, D19) : le MIN des variantes actives — jamais des variantes retirées. */
export function minActiveVariantPriceCents(product: LiveProduct): number {
  return Math.min(...product.variants.map((variant) => variant.basePriceHtCents));
}

/**
 * Variante affichée en fiche produit (29) : celle du coloris demandé pour
 * une membrane (segment d'URL `[couleur]`) ; à défaut d'attribut
 * sélectionnable exposé côté accessoire (coloris/largeur nuls, pas de
 * sélecteur de variante dans cette tranche), la moins chère des variantes
 * actives — cohérent avec le prix « à partir de » déjà affiché sur le hub.
 */
export function pickPdpVariant(product: LiveProduct, colorisSlug?: string): LiveVariant | undefined {
  if (colorisSlug) {
    return product.variants.find(
      (variant) => variant.coloris !== null && couleurToSlug(variant.coloris) === colorisSlug,
    );
  }

  return [...product.variants].sort((a, b) => a.basePriceHtCents - b.basePriceHtCents)[0];
}

async function fetchPublishedProducts(categories: LiveProductCategory[]): Promise<LiveProduct[]> {
  const supabase = createPublicCatalogClient();
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_SELECT_COLUMNS)
    .eq("statut", "publie")
    .eq("is_active", true)
    .eq("product_variants.is_active", true)
    .in("category", categories);

  if (error) {
    throw new Error(`Lecture du catalogue (Supabase) échouée : ${error.message}`);
  }

  return (data ?? [])
    .map((row) => shapeLiveProduct(row as unknown as RawProductRow))
    .filter((product): product is LiveProduct => product !== null);
}

export async function getLiveMembraneProducts(): Promise<LiveProduct[]> {
  return fetchPublishedProducts(["MEMBRANE"]);
}

export async function getLiveMembraneProductBySlug(gammeSlug: string): Promise<LiveProduct | undefined> {
  const products = await getLiveMembraneProducts();
  return products.find((product) => product.slug === gammeSlug);
}

export async function getLiveAccessoryProducts(): Promise<LiveProduct[]> {
  return fetchPublishedProducts(ACCESSORY_CATEGORIES);
}

export async function getLiveAccessoryCategorySlugs(): Promise<string[]> {
  const products = await getLiveAccessoryProducts();
  return Array.from(new Set(products.map((product) => getAccessoryCategorySlug(product.category))));
}

export async function getLiveAccessoriesByCategorySlug(categorieSlug: string): Promise<LiveProduct[]> {
  const products = await getLiveAccessoryProducts();
  return products.filter((product) => getAccessoryCategorySlug(product.category) === categorieSlug);
}

export async function getLiveAccessoryBySlug(
  categorieSlug: string,
  slug: string,
): Promise<LiveProduct | undefined> {
  const products = await getLiveAccessoriesByCategorySlug(categorieSlug);
  return products.find((product) => product.slug === slug);
}

/** Chemin de repli (04/29, « bloqué sur assets photo ») : `image_url` n'est pas encore alimenté en base. */
export const FALLBACK_CATALOG_IMAGE = "/media/placeholders/produit-generique.svg";

/**
 * Libellé d'affichage d'un coloris : la grille APF source est en capitales
 * ("VERT CARAIBES", `data/apf/catalog-facade.json`) — `capitalize()`
 * (`lib/utils/text.ts`, pensé pour le fixture `data/catalog.json` déjà en
 * minuscules) ne suffit plus, d'où ce formatage dédié, ici seulement.
 */
export function formatColorisLabel(coloris: string): string {
  return coloris
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Construit un objet compatible `CatalogEntry` pour UNE variante précise,
 * afin de réutiliser telles quelles les fonctions canoniques déjà en place
 * (`resolvePriceBreakdown`/`computePdpBuyBoxAmounts`, `buildProductJsonLd`,
 * `toCartProductSummary`) sans dupliquer le calcul de prix ni le JSON-LD.
 * `pro_price_ht` reste TOUJOURS `null` ici : ce champ ne doit jamais être lu
 * depuis un chemin public (23), et ces pages n'appellent
 * `resolvePriceBreakdown`/`resolveProUnitHtCents` qu'en rôle "b2c" figé (D5,
 * `docs/decisions.md` 2026-07-08) — la branche pro n'est donc jamais
 * atteinte pour un objet construit ici.
 */
export function toCatalogEntry(
  product: LiveProduct,
  variant: LiveVariant,
  opts?: { gammeSlug: string; couleurSlug: string },
): CatalogEntry {
  return {
    sku: product.sku,
    slug: opts ? `${opts.gammeSlug}-${opts.couleurSlug}` : product.slug,
    name: product.name,
    category: product.category,
    gamme: opts?.gammeSlug,
    couleur: variant.coloris ?? undefined,
    description: product.description ?? undefined,
    base_price_ht: variant.basePriceHtCents,
    pro_price_ht: null,
    vat_rate: product.vatRateBps,
    weight_grams: variant.weightGrams,
    roll_area_m2: variant.rollAreaM2,
    unit: product.category === "MEMBRANE" ? "rouleau" : "unite",
    coverage: variant.coverage,
    image: product.imageUrl ?? FALLBACK_CATALOG_IMAGE,
    in_stock: variant.inStock,
  };
}
