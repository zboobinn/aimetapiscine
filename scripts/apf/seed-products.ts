import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { assertBlindSafe, containsForbiddenToken } from "@/lib/blind-shipping";
import { getSupabaseServiceEnv } from "@/lib/env";

import {
  catalogFacadeFileSchema,
  type CatalogFacadeProduit,
  type CatalogFacadeVariante,
} from "./catalog-facade.schema";
import { catalogRawFileSchema, type CatalogRawRecord } from "./catalog-raw.schema";

/**
 * Seed idempotent de data/apf/catalog-facade.json vers `products` +
 * `product_variants` (étape 4, identité produit). Script hors runtime
 * Next.js (exécuté via tsx) : reconstruit son propre client service_role
 * (même contrainte que scripts/import-catalog.ts, `server-only` bloque
 * l'import direct de `@/lib/supabase/service-role` hors build Next).
 *
 * Upsert par `slug` (produits) et `ref_apf` (variantes) : rejouable sans
 * doublon. N'écrit AUCUN token fournisseur dans une colonne client
 * (`sku`/`name`/`slug`/`category` — `ref_apf` reste confiné à sa propre
 * colonne server-only, cf. migration 20260720000200).
 *
 * `product_variants` n'a PAS de colonne `statut` (seule `products.statut`
 * existe, migration 20260720000000) — un « brouillon » au niveau variante
 * n'a donc pas de représentation dédiée en base. Ce script utilise
 * `product_variants.is_active = false` comme mécanisme de suppression
 * ciblée d'UNE variante (RLS `product_variants_select_public` filtre déjà
 * sur `is_active = true`), et bascule `products.statut` à `brouillon`
 * seulement quand la suppression touche TOUTES les variantes d'un produit.
 * Pas de nouvelle migration ajoutée pour ça : le mécanisme existant suffit
 * et correspond exactement à la sémantique de `is_active` documentée en 03
 * (« retrait d'UNE variante, distinct du retrait total du produit »).
 */

export type ProductCategory =
  | "MEMBRANE"
  | "FEUTRE"
  | "COLLE"
  | "PVC_LIQUIDE"
  | "PROFIL"
  | "SOLVANT"
  | "AUTRE";

// Catégorie dérivée du dictionnaire mapping-familles.md (nom affiché / note),
// PAS du `type` façade à 3 valeurs (consigne étape 4). Seuls les produits de
// type "accessoire" ont besoin d'un mapping explicite ici : "membrane" et
// "pvc-liquide" se déduisent directement du type (voir `deriveCategory`).
const ACCESSOIRE_CATEGORY_BY_SLUG: Record<string, ProductCategory> = {
  "feutre-geotextile": "FEUTRE",

  "colle-aerosol": "COLLE",
  "colle-bostik-1220": "COLLE",
  "colle-bostik-1400": "COLLE",
  "colle-contact": "COLLE",
  "colle-pvc-pose": "COLLE",
  "colle-pvc-vinylique": "COLLE",
  "colle-thermo": "COLLE",
  "mastic-colle": "COLLE",

  "profile-alu-horizontal": "PROFIL",
  "profile-alu-vertical": "PROFIL",
  "profile-pvc-horizontal": "PROFIL",
  "profile-pvc-vertical": "PROFIL",
  "baguette-pvc": "PROFIL",

  solvant: "SOLVANT",

  // AUTRE : pas de mot-clé net dans mapping-familles.md pour ranger ces
  // produits dans FEUTRE/COLLE/PROFIL/SOLVANT — AUTRE est le repli explicite
  // de l'énum, pas une supposition.
  "entretien-antitaches": "AUTRE",
  "entretien-nettoyant": "AUTRE",
  "entretien-pretraitement": "AUTRE",
  "flacon-applicateur": "AUTRE",
  rivets: "AUTRE",
  "tole-colaminee": "AUTRE",

  // Ambigus : voir AMBIGUOUS_CATEGORY_SLUGS ci-dessous (proche PROFIL/COLLE
  // par fonction, mais pas nommés "profilé"/"colle" dans le dictionnaire —
  // rangés en AUTRE par prudence plutôt que devinés).
  "baguette-angle": "AUTRE",
  "bande-soudure": "AUTRE",
  "bandelette-soudure": "AUTRE",
  "jonc-blocage": "AUTRE",
};

// Slugs pour lesquels le rangement en AUTRE est un choix, pas une évidence —
// signalé en WARNING dans le rapport (consigne : "ne pas deviner").
const AMBIGUOUS_CATEGORY_SLUGS = new Set([
  "baguette-angle",
  "bande-soudure",
  "bandelette-soudure",
  "jonc-blocage",
]);

export interface CategoryResolution {
  category: ProductCategory;
  warning: string | null;
}

export function deriveCategory(
  slug: string,
  type: CatalogFacadeProduit["type"],
): CategoryResolution {
  if (type === "membrane") return { category: "MEMBRANE", warning: null };
  if (type === "pvc-liquide") return { category: "PVC_LIQUIDE", warning: null };

  const category = ACCESSOIRE_CATEGORY_BY_SLUG[slug];
  if (!category) {
    throw new Error(
      `Aucune catégorie mappée pour le slug "${slug}" (type accessoire) — à ajouter dans ACCESSOIRE_CATEGORY_BY_SLUG, jamais deviné à la volée.`,
    );
  }

  const warning = AMBIGUOUS_CATEGORY_SLUGS.has(slug)
    ? `Catégorie AUTRE pour "${slug}" : pas de mot-clé net (FEUTRE/COLLE/PROFIL/SOLVANT) dans mapping-familles.md — à confirmer par Léo.`
    : null;

  return { category, warning };
}

/** SKU maison, dérivé du slug — jamais `ref_apf`, jamais de token denylist. */
export function buildSku(slug: string): string {
  const sku = `AP-${slug.toUpperCase()}`;
  if (containsForbiddenToken(sku)) {
    throw new Error(
      `SKU généré "${sku}" contient un token interdit — le slug source dans mapping-familles.md doit être corrigé, pas le script.`,
    );
  }
  return sku;
}

export interface DedupExclusion {
  ref_apf: string;
  slug: string;
  reason: string;
  // true si aucune règle rouleau/découpe n'a permis de trancher (repli sur
  // l'ordre du fichier source) — à relire, pas une certitude.
  warning?: boolean;
}

// "TOUT" : ligne catch-all "toutes couleurs" de la grille source (coloris
// toujours null), pas une variante vendable distincte — et de toute façon
// incompatible avec l'unicité de `ref_apf` en base puisqu'elle réapparaît
// identique sur 3 produits différents.
const NON_SELLABLE_REF_APF = new Set(["TOUT"]);

const ROULEAU_RE = /rouleau/i;
const DECOUPE_RE = /d[ée]coupe/i;

export interface ConditionnementInfo {
  // Prix (centimes) de la ligne "rouleau" (désignation "Rouleau", unité m2
  // dans catalog-raw.json) pour ce ref_apf, si identifiable.
  rouleauPrixCents: number | null;
  // Prix (centimes) de la ligne "à la découpe" (désignation "découpe/decoupe")
  // pour ce même ref_apf, si identifiable.
  decoupePrixCents: number | null;
}

export type ConditionnementLookup = Map<string, ConditionnementInfo>;

/**
 * Construit, depuis le parse brut de la grille (catalog-raw.json), la
 * correspondance ref_apf → prix rouleau / prix découpe — pour les réfs où
 * APF réutilise le même code fournisseur sur les deux conditionnements (cas
 * D40320PB1 : rouleau 63,80 € / découpe 83,70 €). `catalog-facade.json` ne
 * porte plus cette distinction (seul le prix survit à l'étape façade), donc
 * ce lookup est la seule façon de trancher un doublon de `ref_apf` sans
 * dépendre de l'ordre du fichier source.
 */
export function buildConditionnementLookup(rawRecords: CatalogRawRecord[]): ConditionnementLookup {
  const lookup: ConditionnementLookup = new Map();

  for (const record of rawRecords) {
    const isDecoupe = DECOUPE_RE.test(record.designation_brute);
    const isRouleau = !isDecoupe && record.unite === "m2" && ROULEAU_RE.test(record.designation_brute);

    if (!isDecoupe && !isRouleau) continue;

    const entry = lookup.get(record.ref_apf) ?? { rouleauPrixCents: null, decoupePrixCents: null };
    if (isRouleau) entry.rouleauPrixCents = record.prix_public_ht_cents;
    if (isDecoupe) entry.decoupePrixCents = record.prix_public_ht_cents;
    lookup.set(record.ref_apf, entry);
  }

  return lookup;
}

interface RefOccurrence {
  produitIndex: number;
  varianteIndex: number;
  slug: string;
  prix: number | null;
}

/**
 * Déduplique par `ref_apf` (unique en base, migration 20260720000200) :
 * exclut les lignes "TOUT" (catch-all, jamais vendables) et ne garde qu'UNE
 * occurrence par `ref_apf` dupliqué.
 *
 * Ordre de résolution d'un doublon (décision Léo, 2026-07-21 — conditionnement
 * « à la découpe » hors V1, seul le rouleau est vendu) :
 *   1. prix identiques → doublon strict, le premier suffit.
 *   2. prix différents ET `conditionnementLookup` identifie sans ambiguïté
 *      laquelle des occurrences est le rouleau (désignation source) →
 *      le rouleau est retenu EXPLICITEMENT, même si la découpe apparaît
 *      avant lui dans le fichier. Ne dépend plus de l'ordre du fichier.
 *   3. sinon (pas de règle applicable) → repli sur la première occurrence du
 *      fichier, comme avant, mais journalisé avec `warning: true` — jamais
 *      résolu silencieusement.
 */
export function dedupeVariants(
  produits: CatalogFacadeProduit[],
  conditionnementLookup: ConditionnementLookup = new Map(),
): {
  produits: CatalogFacadeProduit[];
  exclusions: DedupExclusion[];
} {
  const exclusions: DedupExclusion[] = [];
  const occurrencesByRef = new Map<string, RefOccurrence[]>();

  produits.forEach((produit, produitIndex) => {
    produit.variantes.forEach((variante, varianteIndex) => {
      const list = occurrencesByRef.get(variante.ref_apf) ?? [];
      list.push({
        produitIndex,
        varianteIndex,
        slug: produit.slug,
        prix: variante.prix_public_ht_cents,
      });
      occurrencesByRef.set(variante.ref_apf, list);
    });
  });

  const keep = new Set<string>();

  for (const [refApf, occurrences] of occurrencesByRef) {
    if (NON_SELLABLE_REF_APF.has(refApf)) {
      for (const occ of occurrences) {
        exclusions.push({
          ref_apf: refApf,
          slug: occ.slug,
          reason: `ligne catch-all "toutes couleurs" (coloris null, prix ${occ.prix}) — pas une variante vendable, et réapparaît sur plusieurs produits (incompatible avec l'unicité de ref_apf).`,
        });
      }
      continue;
    }

    if (occurrences.length === 1) {
      keep.add(`${occurrences[0].produitIndex}:${occurrences[0].varianteIndex}`);
      continue;
    }

    const allSamePrice = occurrences.every((o) => o.prix === occurrences[0].prix);
    const info = conditionnementLookup.get(refApf);
    const rouleauOccurrence =
      !allSamePrice && info?.rouleauPrixCents != null
        ? occurrences.find((o) => o.prix === info.rouleauPrixCents)
        : undefined;
    const decoupeOccurrence =
      !allSamePrice && info?.decoupePrixCents != null
        ? occurrences.find((o) => o.prix === info.decoupePrixCents)
        : undefined;
    const rouleauRuleApplies =
      rouleauOccurrence !== undefined && decoupeOccurrence !== undefined && rouleauOccurrence !== decoupeOccurrence;

    let winner: RefOccurrence;
    let reasonFor: (occ: RefOccurrence) => string;
    let warning = false;

    if (rouleauRuleApplies) {
      winner = rouleauOccurrence;
      reasonFor = (occ) =>
        `doublon ref_apf : découpe (${occ.prix}) écartée au profit du rouleau (${winner.prix}) — désignation source (catalog-raw.json), règle explicite, indépendante de l'ordre du fichier.`;
    } else if (allSamePrice) {
      winner = occurrences[0];
      reasonFor = () => `doublon ref_apf identique (déjà conservé sur "${winner.slug}") — écarté.`;
    } else {
      winner = occurrences[0];
      warning = true;
      reasonFor = (occ) =>
        `doublon ref_apf avec prix DIVERGENT et aucune règle rouleau/découpe applicable (désignation source non trouvée ou ambiguë) — conservé par défaut : ${winner.prix} (produit "${winner.slug}", 1ʳᵉ occurrence du fichier), écarté : ${occ.prix} (produit "${occ.slug}") — À VÉRIFIER À LA MAIN, repli sur l'ordre du fichier.`;
    }

    keep.add(`${winner.produitIndex}:${winner.varianteIndex}`);

    for (const occ of occurrences) {
      if (occ === winner) continue;
      exclusions.push({ ref_apf: refApf, slug: occ.slug, reason: reasonFor(occ), warning });
    }
  }

  const deduped = produits.map((produit, produitIndex) => ({
    ...produit,
    variantes: produit.variantes.filter((_, varianteIndex) => keep.has(`${produitIndex}:${varianteIndex}`)),
  }));

  return { produits: deduped, exclusions };
}

// Référence à l'unité provisoirement fausse (consigne étape 4) — ne doit pas
// partir live tant que non corrigée par Léo, quel que soit le reste de son
// produit parent.
const FORCE_BROUILLON_REF_APF = new Set(["D41612B"]);

export interface VariantVisibility {
  isActive: boolean;
  reasons: string[];
}

/**
 * Détermine si une variante doit être visible (`is_active = true`) ou
 * supprimée (`is_active = false`, équivalent "brouillon" au niveau
 * variante — voir note en tête de fichier).
 *
 * Le forçage "coloris null" est scopé aux types à coloris (membrane,
 * pvc-liquide) : c'est là qu'un coloris manquant signale une donnée
 * incomplète (pas de swatch ni de `water_appearance` exploitable en PDP,
 * 29). Pour un accessoire (profilé, colle, rivet…), `coloris: null` est la
 * norme structurelle — l'appliquer là aussi masquerait à tort la quasi-
 * totalité du catalogue accessoires (décision Léo, 2026-07-20).
 */
export function resolveVariantVisibility(
  produit: CatalogFacadeProduit,
  variante: CatalogFacadeVariante,
): VariantVisibility {
  const reasons: string[] = [];
  const isColoredType = produit.type === "membrane" || produit.type === "pvc-liquide";

  if (isColoredType && variante.coloris === null) {
    reasons.push(
      "coloris manquant sur un produit à coloris (membrane/pvc-liquide) — pas de swatch ni de water_appearance exploitable en PDP (29).",
    );
  }

  if (variante.coloris !== null && containsForbiddenToken(variante.coloris)) {
    reasons.push("coloris contient un token fournisseur interdit — garde-fou blind-shipping (27).");
  }

  if (FORCE_BROUILLON_REF_APF.has(variante.ref_apf)) {
    reasons.push("unité provisoirement fausse pour cette réf — ne doit pas partir live avant correction.");
  }

  if (variante.prix_public_ht_cents === null) {
    reasons.push("prix manquant — non vendable en l'état.");
  }

  return { isActive: reasons.length === 0, reasons };
}

export interface StatutResolution {
  statut: "publie" | "brouillon";
  cascaded: boolean;
}

/** Bascule un produit "publie" en "brouillon" si TOUTES ses variantes
 * survivantes ont été supprimées — jamais l'inverse (un produit déjà
 * brouillon dans le JSON, ex. flag Alkorplan, le reste). */
export function resolveProductStatut(
  baseStatut: CatalogFacadeProduit["statut"],
  variantVisibilities: VariantVisibility[],
): StatutResolution {
  const allSuppressed =
    variantVisibilities.length > 0 && variantVisibilities.every((v) => !v.isActive);

  if (baseStatut === "publie" && allSuppressed) {
    return { statut: "brouillon", cascaded: true };
  }

  return { statut: baseStatut, cascaded: false };
}

// weight_grams est NOT NULL en base (migration 20260720000200) mais absent
// de toute la chaîne de données APF (grille xlsx → catalog-raw.json →
// catalog-facade.json ne portent aucune colonne poids). Placeholder 0
// explicite le temps que Léo fournisse les poids réels (décision Léo,
// 2026-07-20) — JAMAIS utilisé pour un calcul de frais de port tant que non
// corrigé : voir avertissement dans le rapport de fin de script.
const PLACEHOLDER_WEIGHT_GRAMS = 0;

function createServiceRoleClient() {
  const env = getSupabaseServiceEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function loadFacadeCatalog(): CatalogFacadeProduit[] {
  const filePath = join(process.cwd(), "data", "apf", "catalog-facade.json");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = catalogFacadeFileSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("catalog-facade.json invalide — seed annulé :\n");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

function loadRawCatalog(): CatalogRawRecord[] {
  const filePath = join(process.cwd(), "data", "apf", "catalog-raw.json");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = catalogRawFileSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("catalog-raw.json invalide — seed annulé :\n");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

interface SeedReport {
  produitsSeedés: number;
  variantesSeedées: number;
  statutCounts: { publie: number; brouillon: number };
  cascades: string[];
  forcedVariants: Array<{ ref_apf: string; slug: string; reasons: string[] }>;
  categoryWarnings: string[];
  dedupExclusions: DedupExclusion[];
  variantesLuesJson: number;
}

export async function seedProducts(): Promise<SeedReport> {
  const facade = loadFacadeCatalog();
  const variantesLuesJson = facade.reduce((sum, p) => sum + p.variantes.length, 0);

  const conditionnementLookup = buildConditionnementLookup(loadRawCatalog());
  const { produits: deduped, exclusions: dedupExclusions } = dedupeVariants(facade, conditionnementLookup);

  const supabase = createServiceRoleClient();

  const categoryWarnings: string[] = [];
  const cascades: string[] = [];
  const forcedVariants: Array<{ ref_apf: string; slug: string; reasons: string[] }> = [];
  const statutCounts = { publie: 0, brouillon: 0 };
  let variantesSeedées = 0;

  for (const produit of deduped) {
    const { category, warning } = deriveCategory(produit.slug, produit.type);
    if (warning) categoryWarnings.push(warning);

    const sku = buildSku(produit.slug);
    assertBlindSafe(produit.nom_affiche, `seed-products:${produit.slug}.nom_affiche`);
    assertBlindSafe(produit.slug, `seed-products:${produit.slug}.slug`);

    const visibilities = produit.variantes.map((variante) =>
      resolveVariantVisibility(produit, variante),
    );
    visibilities.forEach((vis, index) => {
      if (!vis.isActive) {
        forcedVariants.push({
          ref_apf: produit.variantes[index].ref_apf,
          slug: produit.slug,
          reasons: vis.reasons,
        });
      }
    });

    const { statut, cascaded } = resolveProductStatut(produit.statut, visibilities);
    if (cascaded) cascades.push(produit.slug);
    statutCounts[statut]++;

    const { data: productRow, error: productError } = await supabase
      .from("products")
      .upsert(
        {
          sku,
          name: produit.nom_affiche,
          slug: produit.slug,
          category,
          description: null,
          image_url: null,
          vat_rate: 2000,
          statut,
          unite: produit.unite,
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (productError || !productRow) {
      console.error(`Échec upsert produit "${produit.slug}" :`, productError?.message);
      process.exit(1);
    }

    const variantRows = produit.variantes.map((variante, index) => ({
      product_id: (productRow as { id: string }).id,
      ref_apf: variante.ref_apf,
      coloris: variante.coloris,
      largeur_m: variante.largeur_m,
      longueur_rouleau_m: variante.longueur_rouleau_m,
      libelle: null,
      base_price_ht: variante.prix_public_ht_cents ?? 0,
      pro_price_ht: null,
      weight_grams: PLACEHOLDER_WEIGHT_GRAMS,
      coverage: null,
      water_appearance: null,
      in_stock: true,
      is_active: visibilities[index].isActive,
    }));

    const { error: variantError } = await supabase
      .from("product_variants")
      .upsert(variantRows, { onConflict: "ref_apf" });

    if (variantError) {
      console.error(`Échec upsert variantes pour "${produit.slug}" :`, variantError.message);
      process.exit(1);
    }

    variantesSeedées += variantRows.length;
  }

  return {
    produitsSeedés: deduped.length,
    variantesSeedées,
    statutCounts,
    cascades,
    forcedVariants,
    categoryWarnings,
    dedupExclusions,
    variantesLuesJson,
  };
}

async function main() {
  const report = await seedProducts();

  console.log("=== Seed catalogue façade → products/product_variants ===");
  console.log(`Variantes lues dans catalog-facade.json : ${report.variantesLuesJson}`);
  console.log(`Produits façade seedés                  : ${report.produitsSeedés}`);
  console.log(`Variantes seedées en base                : ${report.variantesSeedées}`);
  console.log(
    `Écart lues → seedées : ${report.variantesLuesJson - report.variantesSeedées} (voir exclusions de dédoublonnage ci-dessous)`,
  );

  console.log(
    `\nRépartition statut produit : publié ${report.statutCounts.publie} / brouillon ${report.statutCounts.brouillon}`,
  );

  console.log(`\nExclusions de dédoublonnage ref_apf (${report.dedupExclusions.length}) :`);
  for (const e of report.dedupExclusions) {
    console.log(`  - ${e.warning ? "⚠️  " : ""}${e.ref_apf} (produit "${e.slug}") : ${e.reason}`);
  }

  console.log(`\nProduits basculés brouillon par cascade (toutes variantes supprimées) (${report.cascades.length}) :`);
  for (const slug of report.cascades) console.log(`  - ${slug}`);

  console.log(`\nVariantes forcées is_active=false (${report.forcedVariants.length}) :`);
  for (const v of report.forcedVariants) {
    console.log(`  - ${v.ref_apf} (produit "${v.slug}") : ${v.reasons.join(" | ")}`);
  }

  console.log(`\nWarnings catégorie ambiguë (${report.categoryWarnings.length}) :`);
  for (const w of report.categoryWarnings) console.log(`  - ${w}`);

  console.log(
    "\n⚠️  weight_grams = 0 (placeholder) sur TOUTES les variantes — aucune donnée poids dans le pipeline APF actuel. " +
      "Ne pas utiliser pour un calcul de frais de port réel tant que Léo n'a pas fourni les poids (12).",
  );

  console.log("\nFichier source : data/apf/catalog-facade.json");
}

// Exécuté seulement en CLI (tsx), jamais quand ce module est importé par les
// tests (`seedProducts` est appelé explicitement dans ce cas).
if (process.env.VITEST === undefined) {
  main();
}
