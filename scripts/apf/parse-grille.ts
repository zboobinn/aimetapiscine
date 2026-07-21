import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import XLSX from "xlsx";

import { catalogRawFileSchema, type CatalogRawRecord } from "./catalog-raw.schema";

/**
 * Parse la grille tarifaire APF (data/apf/grille-2026.xlsx) en un JSON
 * intermédiaire structuré (data/apf/catalog-raw.json). Script hors runtime
 * Next.js (exécuté via tsx) : n'importe rien de `src/`, n'écrit rien en
 * base. Le mapping façade (nommage, coloris, slugs) est une étape manuelle
 * ultérieure — voir docs/04-catalogue-produits.md.
 */

const INPUT_PATH = join(process.cwd(), "data", "apf", "grille-2026.xlsx");
const OUTPUT_PATH = join(process.cwd(), "data", "apf", "catalog-raw.json");

// Tokens fournisseur attendus dans designation_brute / famille_brute (parse
// brut fidèle à la source — voir en-tête du schéma). Surface à reprendre à
// l'étape mapping façade.
const BLIND_SHIPPING_DENYLIST = [
  "HYDROFLEX",
  "POOL DESIGN",
  "ALKORPLAN",
  "RENOLIT",
  "APF",
];

const DIMENSION_RE = /(\d+(?:[.,]\d+)?)\s*m\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*m/i;
const UNIT_M2_RE = /le\s*m²/i;
const UNIT_ML_RE = /le\s*ml/i;
const THICKNESS_RE = /(\d{1,2}\/\d{1,2})/;

function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Dictionnaire best-effort de coloris : uniquement des mots de couleur non
// ambigus. Les noms de gamme/motif (Xtreme "Ice", Vogue "Vintage", 3D Touch
// "Origin"...) ne sont volontairement PAS devinés : mieux vaut null qu'une
// valeur fausse (mapping propre fait à la main par Léo).
const COLOR_PATTERNS: Array<[RegExp, string]> = [
  [/BLANC\s+ADRIATIQUE/, "BLANC ADRIATIQUE"],
  [/BLEU\s+ADRIAT\w*/, "BLEU ADRIATIQUE"],
  [/BLEU\s+TURQUOISE/, "BLEU TURQUOISE"],
  [/BLEU\s+CLAIR/, "BLEU CLAIR"],
  [/BLEU\s+FRANCE/, "BLEU FRANCE"],
  [/BLEU\s+PALE/, "BLEU PALE"],
  [/VERT\s+CARAIBES/, "VERT CARAIBES"],
  [/VERT\s+CAR\.?/, "VERT CARAIBES"],
  [/VERT\s+OLIVE/, "VERT OLIVE"],
  [/VERT\s+ANTILLES/, "VERT ANTILLES"],
  [/GRIS\s+FONCE/, "GRIS FONCE"],
  [/GRIS\s+CLAIR/, "GRIS CLAIR"],
  [/GRIS\s+ANTH\w*/, "GRIS ANTHRACITE"],
  [/GRIS\s+PERLE/, "GRIS PERLE"],
  [/GRIS\s+BETON/, "GRIS BETON"],
  [/VIEUX\s+ROSE/, "VIEUX ROSE"],
  [/\bBLANC\b/, "BLANC"],
  [/\bNOIR\b/, "NOIR"],
  [/\bSABLE\b/, "SABLE"],
  [/\bOLIVE\b/, "OLIVE"],
  [/\bTRANSPARENT\b/, "TRANSPARENT"],
  [/\bCIMENT\b/, "CIMENT"],
  [/\bIVOIRE\b/, "IVOIRE"],
  [/\bBLEU\b/, "BLEU"],
  [/\bVERT\b/, "VERT"],
  [/\bGRIS\b/, "GRIS"],
];

function extractColorCandidate(designation: string): string | null {
  const normalized = stripDiacritics(designation).toUpperCase();
  for (const [pattern, label] of COLOR_PATTERNS) {
    if (pattern.test(normalized)) return label;
  }
  return null;
}

function parsePriceToCents(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw * 100);
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().replace(",", ".");
    const value = Number(normalized);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  return null;
}

interface ParseStats {
  totalRows: number;
  skippedLeadingRows: number;
  headerLines: number;
  productLines: number;
  ignoredEmptyRows: number;
}

function main() {
  const buffer = readFileSync(INPUT_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const stats: ParseStats = {
    totalRows: rows.length,
    skippedLeadingRows: 0,
    headerLines: 0,
    productLines: 0,
    ignoredEmptyRows: 0,
  };

  const records: CatalogRawRecord[] = [];
  const familiesSeen: string[] = [];

  let currentFamilleBrute: string | null = null;
  let currentLargeurM: number | null = null;
  let currentLongueurRouleauM: number | null = null;
  let currentUnite: "m2" | "ml" | "unite" = "unite";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ref = row[0];
    const designation = row[1];
    const prix = row[2];

    // Ligne de date en tête + ligne d'en-tête de colonnes : ignorées.
    if (i < 2) {
      stats.skippedLeadingRows++;
      continue;
    }

    const refIsEmpty = ref === null || ref === undefined || String(ref).trim() === "";
    const prixIsEmpty = prix === null || prix === undefined || String(prix).trim() === "";

    if (refIsEmpty && prixIsEmpty) {
      if (designation === null || String(designation).trim() === "") {
        stats.ignoredEmptyRows++;
        continue;
      }

      // Ligne d'en-tête de famille : met à jour le contexte courant, reporté
      // sur les lignes produit qui suivent.
      stats.headerLines++;
      const familleText = String(designation).trim();
      currentFamilleBrute = familleText;
      familiesSeen.push(familleText);

      const dimMatch = DIMENSION_RE.exec(familleText);
      if (dimMatch) {
        currentLongueurRouleauM = Number(dimMatch[1].replace(",", "."));
        currentLargeurM = Number(dimMatch[2].replace(",", "."));
      } else {
        currentLongueurRouleauM = null;
        currentLargeurM = null;
      }

      const hasM2 = UNIT_M2_RE.test(familleText);
      const hasMl = UNIT_ML_RE.test(familleText);
      if (hasM2 && hasMl) {
        currentUnite = "unite";
      } else if (hasM2) {
        currentUnite = "m2";
      } else if (hasMl) {
        currentUnite = "ml";
      } else {
        currentUnite = "unite";
      }

      continue;
    }

    if (refIsEmpty) {
      // Ligne produit sans réf : ne devrait pas arriver dans cette grille ;
      // on l'ignore plutôt que de fabriquer un enregistrement invalide.
      stats.ignoredEmptyRows++;
      continue;
    }

    // Ligne produit.
    stats.productLines++;
    const refApf = String(ref).trim();
    const designationBrute = String(designation ?? "").trim();
    const warnings: string[] = [];

    const familleBrute = currentFamilleBrute ?? "(sans en-tête de famille)";
    if (currentFamilleBrute === null) {
      warnings.push("aucune ligne d'en-tête de famille précédente dans la feuille");
    }

    const prixCents = parsePriceToCents(prix);
    if (prixCents === null) {
      warnings.push("prix manquant ou illisible");
    }

    const thicknessMatch = THICKNESS_RE.exec(designationBrute);
    const epaisseurRaw = thicknessMatch ? thicknessMatch[1] : null;

    const coloris = extractColorCandidate(designationBrute);
    if (coloris === null) {
      warnings.push("coloris non détecté (best effort) — à mapper à la main");
    }

    // La désignation de la ligne produit elle-même peut préciser une unité
    // de vente différente de celle de la famille (ex. rouleau vendu au m²,
    // mais ligne "à la découpe" vendue au ml) : la mention la plus locale
    // prévaut sur le contexte hérité.
    let unite = currentUnite;
    const rowHasM2 = UNIT_M2_RE.test(designationBrute);
    const rowHasMl = UNIT_ML_RE.test(designationBrute);
    if (rowHasM2 && rowHasMl) {
      warnings.push("unité ambiguë au niveau de la ligne (m² et ml détectés) — unité de famille conservée");
    } else if (rowHasM2 && currentUnite !== "m2") {
      warnings.push(`unité de la ligne (m²) diffère de la famille (${currentUnite}) — unité de la ligne retenue`);
      unite = "m2";
    } else if (rowHasMl && currentUnite !== "ml") {
      warnings.push(`unité de la ligne (ml) diffère de la famille (${currentUnite}) — unité de la ligne retenue`);
      unite = "ml";
    }

    records.push({
      ref_apf: refApf,
      designation_brute: designationBrute,
      famille_brute: familleBrute,
      largeur_m: currentLargeurM,
      longueur_rouleau_m: currentLongueurRouleauM,
      unite,
      prix_public_ht_cents: prixCents,
      epaisseur_raw: epaisseurRaw,
      coloris_candidat: coloris,
      warnings,
    });
  }

  const validation = catalogRawFileSchema.safeParse(records);
  if (!validation.success) {
    console.error("Sortie invalide contre le schéma Zod — écriture annulée :\n");
    for (const issue of validation.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(validation.data, null, 2) + "\n", "utf-8");

  // --- Rapport console ---
  console.log("=== Parse grille APF ===");
  console.log(`Lignes totales feuille       : ${stats.totalRows}`);
  console.log(`Lignes d'en-tête ignorées    : ${stats.skippedLeadingRows}`);
  console.log(`Lignes d'en-tête de famille  : ${stats.headerLines}`);
  console.log(`Lignes vides ignorées        : ${stats.ignoredEmptyRows}`);
  console.log(`Lignes produit parsées       : ${stats.productLines}`);
  console.log(`Records validés (Zod)        : ${validation.data.length}`);

  console.log(`\nFamilles trouvées (${familiesSeen.length}) :`);
  for (const f of familiesSeen) console.log(`  - ${f}`);

  const byUnit: Record<string, number> = { m2: 0, ml: 0, unite: 0 };
  for (const r of validation.data) byUnit[r.unite]++;
  console.log("\nRépartition par unité :");
  console.log(`  m2    : ${byUnit.m2}`);
  console.log(`  ml    : ${byUnit.ml}`);
  console.log(`  unite : ${byUnit.unite}`);

  const prices = validation.data
    .map((r) => r.prix_public_ht_cents)
    .filter((p): p is number => p !== null);
  if (prices.length > 0) {
    const min = Math.min(...prices) / 100;
    const max = Math.max(...prices) / 100;
    console.log(`\nFourchette de prix : ${min.toFixed(2)} € — ${max.toFixed(2)} €`);
  } else {
    console.log("\nFourchette de prix : aucun prix valide");
  }

  const withWarnings = validation.data.filter((r) => r.warnings.length > 0);
  console.log(`\nLignes avec warning (${withWarnings.length}/${validation.data.length}) :`);
  for (const r of withWarnings) {
    console.log(`  - ${r.ref_apf} : ${r.warnings.join("; ")}`);
  }

  console.log("\n=== Surface blind-shipping (tokens fournisseur trouvés) ===");
  const tokenCounts: Record<string, number> = {};
  for (const token of BLIND_SHIPPING_DENYLIST) tokenCounts[token] = 0;
  for (const r of validation.data) {
    const haystack = `${r.designation_brute} ${r.famille_brute}`.toUpperCase();
    for (const token of BLIND_SHIPPING_DENYLIST) {
      if (haystack.includes(token)) tokenCounts[token]++;
    }
  }
  for (const [token, count] of Object.entries(tokenCounts)) {
    console.log(`  ${token} : ${count} ligne(s)`);
  }
  console.log(
    "\nCes tokens sont attendus dans cet artefact intermédiaire server-only.",
  );
  console.log(
    "Ils devront être réécrits/mappés à l'étape façade (nommage maison), pas ici.",
  );

  console.log(`\nFichier écrit : ${OUTPUT_PATH}`);
}

main();
