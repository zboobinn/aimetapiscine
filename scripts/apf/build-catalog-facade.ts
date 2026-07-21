import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  catalogFacadeFileSchema,
  type CatalogFacadeProduit,
  type CatalogFacadeVariante,
} from "./catalog-facade.schema";
import { catalogRawFileSchema, type CatalogRawRecord } from "./catalog-raw.schema";

/**
 * Fusionne le parse brut (catalog-raw.json, étape 1) et le dictionnaire de
 * correspondance (mapping-familles.md, dictionnaire figé) pour produire les
 * records FAÇADE (data/apf/catalog-facade.json) — sans aucun token
 * fournisseur dans les champs client. Script hors runtime Next.js (exécuté
 * via tsx) : n'importe rien de `src/`, n'écrit rien en base. `ref_apf` est
 * conservé server-only dans l'artefact mais ne doit jamais atteindre un
 * champ client — vérifié par tests/catalog-facade-blind-shipping.spec.ts.
 */

const RAW_PATH = join(process.cwd(), "data", "apf", "catalog-raw.json");
const DICT_PATH = join(process.cwd(), "data", "apf", "mapping-familles.md");
const OUTPUT_PATH = join(process.cwd(), "data", "apf", "catalog-facade.json");

const DIMENSION_RE = /(\d+(?:[.,]\d+)?)\s*m\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*m/i;

type DictType = "membrane" | "pvc-liquide" | "accessoire" | "outillage" | "entete" | "non-publié" | "multi";
type DictUnite = "m2" | "ml" | "unite";

interface DictEntry {
  numero: number;
  familleBrute: string;
  nomArmapool: string | null;
  baseSlug: string | null;
  type: DictType;
  unite: DictUnite | null;
  note: string;
  isFlag: boolean;
  // Vrai UNIQUEMENT pour #26 : sa colonne "Famille brute" elle-même est un
  // texte de remplissage ("*(doublon vide de #25)*"), pas un texte de
  // famille réel à faire correspondre. Ne pas confondre avec un
  // `nom_armapool` placeholder ("*(variante 2,05 de #2)*", "*(décor...)*") :
  // celui-là porte un vrai texte de famille en colonne 2, juste pas de nom
  // d'affichage propre — géré séparément lors du choix du nom du produit.
  familleBrutePlaceholder: boolean;
  rawFamilleBrute?: string;
}

/** Une ligne du "Bloc #36 — mapping par référence" : appariement par
 * `ref_apf` explicite plutôt que par famille (29 réfs hétérogènes sous un
 * seul en-tête source, cf. mapping-familles.md). */
interface RefEntry {
  refApf: string;
  nomArmapool: string;
  baseSlug: string;
  type: DictType;
  unite: DictUnite;
  note: string;
}

/** Mapping résolu pour une ligne brute, quelle que soit sa provenance
 * (famille classique via `DictEntry`, ou réf explicite via `RefEntry` du
 * bloc #36) — unifie les deux modes d'appariement pour la suite du script. */
interface ResolvedMapping {
  baseSlug: string;
  nomArmapool: string;
  type: CatalogFacadeProduit["type"];
  unite: DictUnite;
  isFlag: boolean;
  sourceLabel: string;
}

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

/** Réduit un texte de famille à son "cœur" alphabétique, en coupant avant le
 * premier chiffre (les dimensions/unités commencent toujours par un chiffre)
 * puis en retirant la ponctuation résiduelle en bout de chaîne. */
function familyCore(text: string): string {
  const upto = text.search(/\d/);
  const cut = upto === -1 ? text : text.slice(0, upto);
  return normalize(cut).replace(/[-–,]+$/, "").trim();
}

/** Extrait la LARGEUR (dernier nombre suivi de "m") mentionnée dans un texte
 * de famille — sert à désambiguïser deux familles qui partagent le même
 * cœur de nom mais diffèrent par la largeur (1,65 m vs 2,05 m). */
function extractWidth(text: string): number | null {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*m\b/gi)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1].replace(",", "."));
}

function parseDictionary(mdContent: string): DictEntry[] {
  const entries: DictEntry[] = [];
  const lines = mdContent.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const inner = cells.slice(1, -1);
    if (inner.length !== 7) continue;

    const numero = Number(inner[0]);
    if (!Number.isInteger(numero)) continue; // saute l'en-tête et la ligne de séparation

    const [, familleBrute, nomArmapoolRaw, baseSlugRaw, typeRaw, uniteRaw, note] = inner;

    const nomArmapool = nomArmapoolRaw === "—" ? null : nomArmapoolRaw;
    const baseSlug = baseSlugRaw === "—" ? null : baseSlugRaw;
    const unite = uniteRaw === "—" || uniteRaw === "" ? null : (uniteRaw as DictUnite);

    entries.push({
      numero,
      familleBrute,
      nomArmapool,
      baseSlug,
      type: typeRaw as DictType,
      unite,
      note,
      isFlag: note.includes("⚠️ flag"),
      familleBrutePlaceholder: familleBrute.startsWith("*("),
    });
  }

  return entries;
}

/** Parse le "Bloc #36 — mapping par référence" (table à 6 colonnes :
 * réf_apf | nom_armapool | base_slug | type | unité | note), distincte des
 * tables famille à 7 colonnes traitées par `parseDictionary`. */
function parseRefBlock(mdContent: string): Map<string, RefEntry> {
  const byRef = new Map<string, RefEntry>();
  const lines = mdContent.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const inner = cells.slice(1, -1);
    if (inner.length !== 6) continue;

    const [refApf, nomArmapool, baseSlug, type, unite] = inner;
    if (refApf === "" || refApf === "réf_apf" || /^-+$/.test(refApf)) continue; // en-tête / séparateur

    byRef.set(refApf, {
      refApf,
      nomArmapool,
      baseSlug,
      type: type as DictType,
      unite: unite as DictUnite,
      note: inner[5],
    });
  }

  return byRef;
}

interface ParseWarnings {
  unitMismatches: string[];
  missingDictEntry: string[];
  missingColoris: Array<{ ref_apf: string; slug: string }>;
}

interface Block36UnitDivergence {
  ref_apf: string;
  uniteLigne: DictUnite;
  uniteDictionnaire: DictUnite;
  prix_public_ht_cents: number | null;
}

function main() {
  const rawRecords = catalogRawFileSchema.parse(
    JSON.parse(readFileSync(RAW_PATH, "utf-8")),
  );
  const mdContent = readFileSync(DICT_PATH, "utf-8");
  const dictEntries = parseDictionary(mdContent);
  const refBlock = parseRefBlock(mdContent);

  // --- Sanity check récap (D-vérif) : le nombre de familles flaggées doit
  // correspondre exactement à ce que le récap du dictionnaire annonce.
  const expectedFlagNumeros = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 25]);
  const actualFlagNumeros = new Set(dictEntries.filter((e) => e.isFlag).map((e) => e.numero));
  if (
    actualFlagNumeros.size !== expectedFlagNumeros.size ||
    [...expectedFlagNumeros].some((n) => !actualFlagNumeros.has(n))
  ) {
    throw new Error(
      `Incohérence flag Alkorplan : attendu {${[...expectedFlagNumeros].join(",")}}, trouvé {${[...actualFlagNumeros].join(",")}}. ` +
        "Le récap du dictionnaire et les notes '⚠️ flag' ont divergé — à réconcilier avant de continuer.",
    );
  }

  // --- Familles brutes distinctes réellement portées par au moins une ligne
  // produit, dans l'ordre d'apparition. Certains en-têtes de section du
  // dictionnaire (ex. #1, #9, #11, #27) sont immédiatement suivis d'un autre
  // en-tête dans la feuille source, sans jamais avoir de ligne produit à
  // eux : leur texte n'apparaît alors JAMAIS ici (« avalés »). C'est attendu
  // pour un en-tête ; ce ne le serait pas pour une famille productive.
  const distinctRawFamilies: string[] = [];
  const seenFamilies = new Set<string>();
  for (const record of rawRecords) {
    if (!seenFamilies.has(record.famille_brute)) {
      seenFamilies.add(record.famille_brute);
      distinctRawFamilies.push(record.famille_brute);
    }
  }

  // --- Appariement dictionnaire -> famille brute réelle, par cœur de nom
  // (texte avant le premier chiffre) + largeur (désambiguïse 1,65 m vs
  // 2,05 m quand deux entrées partagent le même cœur). Chaque famille brute
  // n'est réclamée qu'une fois. #26 n'a pas de texte de famille réel
  // (placeholder) : jamais recherché, la fusion vers #25 se fait par
  // ailleurs (25 et 26 portent le même texte de famille brute réel).
  const claimedIndexes = new Set<number>();
  const unmatchedProductiveEntries: string[] = [];

  for (const entry of dictEntries) {
    if (entry.familleBrutePlaceholder) continue;

    const core = familyCore(entry.familleBrute);
    const dictWidth = extractWidth(entry.familleBrute);

    const candidateIndex = distinctRawFamilies.findIndex((raw, idx) => {
      if (claimedIndexes.has(idx)) return false;
      if (!normalize(raw).startsWith(core)) return false;
      if (dictWidth !== null) {
        const rawDims = DIMENSION_RE.exec(raw);
        const rawWidth = rawDims ? Number(rawDims[2].replace(",", ".")) : null;
        if (rawWidth === null || Math.abs(rawWidth - dictWidth) > 1e-9) return false;
      }
      return true;
    });

    if (candidateIndex === -1) {
      const isProductive =
        entry.type === "membrane" ||
        entry.type === "pvc-liquide" ||
        entry.type === "accessoire" ||
        entry.type === "multi";
      if (isProductive) {
        unmatchedProductiveEntries.push(
          `#${entry.numero} "${entry.familleBrute}" (cœur "${core}"${dictWidth !== null ? `, largeur ${dictWidth}` : ""})`,
        );
      }
      // Sinon (entete / non-publié) : en-tête avalée par la suivante dans la
      // feuille source, 0 ligne produit ne référence jamais son texte. Attendu.
      continue;
    }

    claimedIndexes.add(candidateIndex);
    entry.rawFamilleBrute = distinctRawFamilies[candidateIndex];
  }

  if (unmatchedProductiveEntries.length > 0) {
    throw new Error(
      "Entrée(s) dictionnaire productive(s) sans famille brute correspondante — le dictionnaire ou le parse a dérivé :\n  - " +
        unmatchedProductiveEntries.join("\n  - "),
    );
  }

  const unclaimedRawFamilies = distinctRawFamilies.filter((_, idx) => !claimedIndexes.has(idx));

  // --- Lookup famille brute -> entrée dictionnaire "productive" en priorité
  // (gère la fusion doublon #26 -> #25 : les deux partagent le même texte de
  // famille brute réel, on garde celle qui porte un base_slug).
  const byRawFamille = new Map<string, DictEntry>();
  for (const entry of dictEntries) {
    if (!entry.rawFamilleBrute) continue;
    const existing = byRawFamille.get(entry.rawFamilleBrute);
    if (!existing || (!existing.baseSlug && entry.baseSlug)) {
      byRawFamille.set(entry.rawFamilleBrute, entry);
    }
  }

  // --- Fusion : regroupe les lignes brutes par base_slug. Deux modes
  // d'appariement au niveau ligne : familles classiques (via `byRawFamille`,
  // cœur de nom + largeur) et bloc #36 (type "multi" : appariement par
  // `ref_apf` explicite dans `refBlock`, chaque réf peut porter son propre
  // base_slug/nom/unité — plusieurs réfs partageant un base_slug deviennent
  // des variantes de conditionnement, ex. colle-bostik-1220 pot + tube).
  const groups = new Map<string, { mappings: ResolvedMapping[]; records: CatalogRawRecord[] }>();
  const warnings: ParseWarnings = { unitMismatches: [], missingDictEntry: [], missingColoris: [] };
  const lineCountByNumero = new Map<number, number>();

  let excludedLineCount = 0;
  const block36RefsSeen = new Set<string>();
  const block36UnitDivergences: Block36UnitDivergence[] = [];

  for (const record of rawRecords) {
    const dictEntry = byRawFamille.get(record.famille_brute);

    if (!dictEntry) {
      warnings.missingDictEntry.push(
        `${record.ref_apf} : aucune entrée dictionnaire pour la famille "${record.famille_brute}"`,
      );
      excludedLineCount++;
      continue;
    }

    let resolved: ResolvedMapping;

    if (dictEntry.type === "multi") {
      const refEntry = refBlock.get(record.ref_apf);
      if (!refEntry) {
        warnings.missingDictEntry.push(
          `${record.ref_apf} : aucune entrée dans le bloc #36 par référence (famille "${record.famille_brute}")`,
        );
        excludedLineCount++;
        continue;
      }
      block36RefsSeen.add(refEntry.refApf);

      // Mapping par RÉFÉRENCE (bloc #36) : l'unité du dictionnaire est
      // AUTORITAIRE, réf par réf — jamais écrasée par la mention de la ligne
      // brute (contrairement au mode "cœur de nom", où la ligne peut
      // préciser une famille sans unité propre, cf. étape 1). Toute
      // divergence est loguée pour relecture manuelle, sans effet sur la
      // sortie : le prix de ligne reste tel quel, dans l'unité déclarée par
      // le dictionnaire pour CETTE réf précise.
      if (record.unite !== refEntry.unite) {
        block36UnitDivergences.push({
          ref_apf: refEntry.refApf,
          uniteLigne: record.unite,
          uniteDictionnaire: refEntry.unite,
          prix_public_ht_cents: record.prix_public_ht_cents,
        });
      }

      resolved = {
        baseSlug: refEntry.baseSlug,
        nomArmapool: refEntry.nomArmapool,
        type: refEntry.type as CatalogFacadeProduit["type"],
        unite: refEntry.unite,
        isFlag: false, // bloc #36 toujours publié (récap : accessoires génériques)
        sourceLabel: `#36 réf ${refEntry.refApf}`,
      };
    } else if (dictEntry.type === "entete" || dictEntry.type === "non-publié") {
      excludedLineCount++;
      lineCountByNumero.set(dictEntry.numero, (lineCountByNumero.get(dictEntry.numero) ?? 0) + 1);
      continue;
    } else if (!dictEntry.baseSlug || !dictEntry.nomArmapool) {
      // Ne devrait pas arriver pour un type productif — filet de sécurité,
      // on n'invente pas de nom.
      warnings.missingDictEntry.push(
        `${record.ref_apf} : entrée dictionnaire #${dictEntry.numero} sans base_slug/nom_armapool exploitable`,
      );
      excludedLineCount++;
      continue;
    } else {
      resolved = {
        baseSlug: dictEntry.baseSlug,
        nomArmapool: dictEntry.nomArmapool,
        type: dictEntry.type as CatalogFacadeProduit["type"],
        unite: dictEntry.unite!,
        isFlag: dictEntry.isFlag,
        sourceLabel: `#${dictEntry.numero}`,
      };
    }

    const group = groups.get(resolved.baseSlug) ?? { mappings: [], records: [] };
    group.mappings.push(resolved);
    group.records.push(record);
    groups.set(resolved.baseSlug, group);
  }

  // --- Construction des produits façade.
  const produits: CatalogFacadeProduit[] = [];

  for (const [baseSlug, group] of groups) {
    const primary =
      group.mappings.find((m) => !m.nomArmapool.startsWith("*(")) ?? group.mappings[0];
    const nomAffiche = primary.nomArmapool;
    const type = primary.type;
    const uniteProduit = primary.unite;
    const statut: CatalogFacadeProduit["statut"] = group.mappings.some((m) => m.isFlag)
      ? "brouillon"
      : "publie";

    const variantes: CatalogFacadeVariante[] = group.records.map((record, index) => {
      const ownMapping = group.mappings[index];
      const isBlock36 = ownMapping.sourceLabel.startsWith("#36");
      // Comparaison contre l'unité déclarée par LE MAPPING DE CETTE LIGNE
      // (sa propre entrée dictionnaire — famille ou réf), pas contre
      // `uniteProduit` (celle du mapping "primaire" du groupe, qui peut
      // différer quand plusieurs réfs du bloc #36 partagent un base_slug
      // avec des unités déclarées différentes, ex. tole-colaminee : m2 pour
      // la ligne pleine, unite pour la variante "baguette coupée"). Le bloc
      // #36 a sa propre liste dédiée (`block36UnitDivergences`) : pas de
      // double warning ici pour ces réfs.
      if (!isBlock36 && record.unite !== ownMapping.unite) {
        warnings.unitMismatches.push(
          `${record.ref_apf} (produit "${baseSlug}") : unité de la ligne = "${record.unite}", ` +
            `unité déclarée par le dictionnaire = "${ownMapping.unite}" — conservée telle quelle (pas d'écrasement silencieux).`,
        );
      }
      if (record.coloris_candidat === null) {
        warnings.missingColoris.push({ ref_apf: record.ref_apf, slug: baseSlug });
      }
      return {
        coloris: record.coloris_candidat,
        largeur_m: record.largeur_m,
        longueur_rouleau_m: record.longueur_rouleau_m,
        prix_public_ht_cents: record.prix_public_ht_cents,
        ref_apf: record.ref_apf,
      };
    });

    produits.push({
      slug: baseSlug,
      nom_affiche: nomAffiche,
      type,
      unite: uniteProduit,
      statut,
      variantes,
    });
  }

  produits.sort((a, b) => a.slug.localeCompare(b.slug));

  const validation = catalogFacadeFileSchema.safeParse(produits);
  if (!validation.success) {
    console.error("Sortie façade invalide contre le schéma Zod — écriture annulée :\n");
    for (const issue of validation.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(validation.data, null, 2) + "\n", "utf-8");

  // --- Rapport console ---
  const totalVariantes = validation.data.reduce((sum, p) => sum + p.variantes.length, 0);

  console.log("=== Fusion catalogue façade ArmaPool ===");
  console.log(`Lignes brutes en entrée         : ${rawRecords.length}`);
  console.log(`Produits façade                 : ${validation.data.length}`);
  console.log(`Variantes façade                : ${totalVariantes}`);
  console.log(`Lignes exclues                  : ${excludedLineCount}`);
  console.log(`Somme de contrôle (${totalVariantes} + ${excludedLineCount})       : ${totalVariantes + excludedLineCount} (attendu 289)`);

  const byType = new Map<string, number>();
  for (const p of validation.data) byType.set(p.type, (byType.get(p.type) ?? 0) + 1);
  console.log("\nRépartition des produits par type :");
  for (const [type, count] of byType) console.log(`  ${type} : ${count}`);

  const block36ProduitSlugs = new Set(
    [...groups.entries()]
      .filter(([, group]) => group.mappings.some((m) => m.sourceLabel.startsWith("#36")))
      .map(([slug]) => slug),
  );
  const block36Produits = validation.data.filter((p) => block36ProduitSlugs.has(p.slug));
  const block36Variantes = block36Produits.reduce((sum, p) => sum + p.variantes.length, 0);
  console.log(
    `\nBloc #36 (mapping par référence) : ${refBlock.size} réfs dans le dictionnaire, ` +
      `${block36RefsSeen.size} réfs réellement rencontrées dans le parse brut, ` +
      `${block36Produits.length} produits façade, ${block36Variantes} variantes.`,
  );
  for (const p of block36Produits) {
    console.log(`  - ${p.slug} (${p.nom_affiche}) — ${p.variantes.length} variante(s), unité ${p.unite}`);
  }
  const block36UnusedRefs = [...refBlock.keys()].filter((ref) => !block36RefsSeen.has(ref));
  if (block36UnusedRefs.length > 0) {
    console.log(
      `\n⚠️ Réfs du bloc #36 jamais rencontrées dans catalog-raw.json (${block36UnusedRefs.length}) : ${block36UnusedRefs.join(", ")}`,
    );
  }

  console.log(
    `\nDivergences d'unité bloc #36 — ligne brute vs dictionnaire (${block36UnitDivergences.length}) : ` +
      "le DICTIONNAIRE est retenu dans la sortie ; à relire, aucune ne doit être un vrai prix au ml déguisé.",
  );
  for (const d of block36UnitDivergences) {
    const prix = d.prix_public_ht_cents !== null ? `${(d.prix_public_ht_cents / 100).toFixed(2)} €` : "prix manquant";
    console.log(
      `  - ${d.ref_apf} : unité ligne = "${d.uniteLigne}", unité dictionnaire (retenue) = "${d.uniteDictionnaire}", prix = ${prix}`,
    );
  }

  const brouillonCount = validation.data.filter((p) => p.statut === "brouillon").length;
  console.log(`\nProduits en statut brouillon (flag Alkorplan) : ${brouillonCount}/${validation.data.length}`);
  for (const p of validation.data.filter((p) => p.statut === "brouillon")) {
    console.log(`  - ${p.slug} (${p.nom_affiche}) — ${p.variantes.length} variante(s)`);
  }

  console.log(`\nFamilles exclues du seed (${excludedLineCount} ligne(s) produit au total) :`);
  const excludedEntries = dictEntries.filter((e) => e.type === "entete" || e.type === "non-publié");
  for (const e of excludedEntries) {
    const reason =
      e.type === "entete"
        ? "en-tête (ignorer au seed)"
        : e.note.includes("PARKÉ")
          ? "parkée — décor, nom à inventer sur visuel"
          : "hors V1";
    const lineCount = lineCountByNumero.get(e.numero) ?? 0;
    console.log(`  #${e.numero} "${e.familleBrute}" — ${reason} — ${lineCount} ligne(s)`);
  }
  if (unclaimedRawFamilies.length > 0) {
    console.log(
      `\n⚠️ Familles brutes non réclamées par le dictionnaire (${unclaimedRawFamilies.length}) — ne devrait pas arriver, vérifier familyCore/extractWidth :`,
    );
    for (const f of unclaimedRawFamilies) console.log(`  - ${f}`);
  }

  console.log(`\nVariantes sans coloris à compléter à la main (${warnings.missingColoris.length}) :`);
  for (const w of warnings.missingColoris) {
    console.log(`  - ${w.ref_apf} (produit "${w.slug}")`);
  }

  console.log(`\nWarnings d'unité (invariant financier) (${warnings.unitMismatches.length}) :`);
  for (const w of warnings.unitMismatches) console.log(`  - ${w}`);

  if (warnings.missingDictEntry.length > 0) {
    console.log(`\nLignes sans entrée dictionnaire (${warnings.missingDictEntry.length}) :`);
    for (const w of warnings.missingDictEntry) console.log(`  - ${w}`);
  }

  console.log(`\nFichier écrit : ${OUTPUT_PATH}`);
}

main();
