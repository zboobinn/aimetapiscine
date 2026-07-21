import { describe, expect, it } from "vitest";

import {
  buildConditionnementLookup,
  buildSku,
  dedupeVariants,
  deriveCategory,
  resolveProductStatut,
  resolveVariantVisibility,
  type ConditionnementLookup,
  type VariantVisibility,
} from "../scripts/apf/seed-products";
import type { CatalogFacadeProduit, CatalogFacadeVariante } from "../scripts/apf/catalog-facade.schema";
import type { CatalogRawRecord } from "../scripts/apf/catalog-raw.schema";

/**
 * Étape 4 (seed catalogue façade) — tests unitaires PURS (aucun réseau,
 * aucune écriture Supabase) sur la logique de scripts/apf/seed-products.ts :
 * catégorie, SKU, dédoublonnage ref_apf, règles de forçage brouillon,
 * cascade produit. Volontairement séparés d'une vérification live
 * (RLS/embed/idempotence en base) — voir scripts/apf/verify-seed-live.ts,
 * qui n'est PAS exécuté par `pnpm test` (comme scripts/resanitize-storage.ts,
 * spec 27 : vérification manuelle contre l'infra réelle, pas automatisée).
 */

function variante(overrides: Partial<CatalogFacadeVariante> = {}): CatalogFacadeVariante {
  return {
    coloris: null,
    largeur_m: null,
    longueur_rouleau_m: null,
    prix_public_ht_cents: 1000,
    ref_apf: "REF-TEST",
    ...overrides,
  };
}

function produit(overrides: Partial<CatalogFacadeProduit> = {}): CatalogFacadeProduit {
  return {
    slug: "produit-test",
    nom_affiche: "Produit test",
    type: "accessoire",
    unite: "unite",
    statut: "publie",
    variantes: [variante()],
    ...overrides,
  };
}

function rawRecord(overrides: Partial<CatalogRawRecord> = {}): CatalogRawRecord {
  return {
    ref_apf: "REF-TEST",
    designation_brute: "Rouleau de 25 m x 1.65 m",
    famille_brute: "FAMILLE TEST",
    largeur_m: 1.65,
    longueur_rouleau_m: 25,
    unite: "m2",
    prix_public_ht_cents: 1000,
    epaisseur_raw: null,
    coloris_candidat: null,
    warnings: [],
    ...overrides,
  };
}

describe("deriveCategory", () => {
  it("membrane et pvc-liquide se déduisent directement du type façade, jamais du dictionnaire accessoire", () => {
    expect(deriveCategory("membrane-150-lisse", "membrane")).toEqual({
      category: "MEMBRANE",
      warning: null,
    });
    expect(deriveCategory("pvc-liquide", "pvc-liquide")).toEqual({
      category: "PVC_LIQUIDE",
      warning: null,
    });
  });

  it("mappe les accessoires non ambigus sans warning", () => {
    expect(deriveCategory("feutre-geotextile", "accessoire").category).toBe("FEUTRE");
    expect(deriveCategory("feutre-geotextile", "accessoire").warning).toBeNull();
    expect(deriveCategory("colle-bostik-1220", "accessoire").category).toBe("COLLE");
    expect(deriveCategory("profile-pvc-horizontal", "accessoire").category).toBe("PROFIL");
    expect(deriveCategory("solvant", "accessoire").category).toBe("SOLVANT");
  });

  it("signale par warning les accessoires rangés en AUTRE par défaut (ambigus)", () => {
    const result = deriveCategory("jonc-blocage", "accessoire");
    expect(result.category).toBe("AUTRE");
    expect(result.warning).not.toBeNull();
  });

  it("ne devine jamais un slug accessoire inconnu : lève une erreur explicite", () => {
    expect(() => deriveCategory("slug-jamais-vu", "accessoire")).toThrow(/jamais deviné/);
  });
});

describe("buildSku", () => {
  it("génère un SKU maison stable dérivé du slug, jamais un ref_apf", () => {
    expect(buildSku("membrane-150-lisse")).toBe("AP-MEMBRANE-150-LISSE");
  });

  it("rejette un SKU qui contiendrait un token interdit (denylist de test injectée par tests/setup.ts)", () => {
    expect(() => buildSku("gamme-zolvex-premium")).toThrow(/token interdit/);
  });
});

describe("dedupeVariants", () => {
  it("exclut toutes les occurrences de la référence catch-all TOUT", () => {
    const input = [
      produit({ slug: "a", variantes: [variante({ ref_apf: "TOUT", coloris: null })] }),
      produit({ slug: "b", variantes: [variante({ ref_apf: "TOUT", coloris: null })] }),
    ];
    const { produits, exclusions } = dedupeVariants(input);

    expect(produits.find((p) => p.slug === "a")?.variantes).toHaveLength(0);
    expect(produits.find((p) => p.slug === "b")?.variantes).toHaveLength(0);
    expect(exclusions).toHaveLength(2);
    expect(exclusions.every((e) => e.ref_apf === "TOUT")).toBe(true);
  });

  it("prix divergent SANS règle rouleau/découpe applicable : garde la première occurrence, journalise en WARNING", () => {
    const input = [
      produit({ slug: "a", variantes: [variante({ ref_apf: "DUP1", prix_public_ht_cents: 100 })] }),
      produit({ slug: "b", variantes: [variante({ ref_apf: "DUP1", prix_public_ht_cents: 200 })] }),
    ];
    // Aucun lookup fourni (comportement par défaut) : pas de règle rouleau/découpe
    // disponible pour trancher — repli sur la première occurrence du fichier.
    const { produits, exclusions } = dedupeVariants(input);

    expect(produits.find((p) => p.slug === "a")?.variantes).toHaveLength(1);
    expect(produits.find((p) => p.slug === "b")?.variantes).toHaveLength(0);
    expect(exclusions).toHaveLength(1);
    expect(exclusions[0].reason).toMatch(/DIVERGENT/);
    expect(exclusions[0].warning).toBe(true);
  });

  it("ne touche pas aux ref_apf uniques", () => {
    const input = [produit({ variantes: [variante({ ref_apf: "UNIQUE-1" })] })];
    const { produits, exclusions } = dedupeVariants(input);

    expect(produits[0].variantes).toHaveLength(1);
    expect(exclusions).toHaveLength(0);
  });

  it("RÉGRESSION D40320PB1 : découpe listée EN PREMIER dans le fichier — retient quand même le rouleau (règle explicite, pas l'ordre du fichier)", () => {
    // Reproduit le risque signalé : si la grille APF est réordonnée et que la
    // ligne "à la découpe" apparaît avant la ligne "Rouleau" pour un même
    // ref_apf, l'ancien comportement ("garde la première occurrence") aurait
    // gardé la découpe — violation de la décision "rouleau seul en V1".
    const lookup: ConditionnementLookup = new Map([
      ["D40320PB1", { rouleauPrixCents: 6380, decoupePrixCents: 8370 }],
    ]);

    const input = [
      produit({
        slug: "membrane-antiderapante-relief",
        type: "membrane",
        variantes: [
          // Découpe EN PREMIER dans le fichier — le piège.
          variante({ ref_apf: "D40320PB1", coloris: "BLEU", prix_public_ht_cents: 8370 }),
          variante({ ref_apf: "D40320PB1", coloris: "BLEU", prix_public_ht_cents: 6380 }),
        ],
      }),
    ];

    const { produits, exclusions } = dedupeVariants(input, lookup);
    const kept = produits[0].variantes;

    expect(kept).toHaveLength(1);
    expect(kept[0].prix_public_ht_cents).toBe(6380); // le rouleau, pas la découpe (8370)
    expect(exclusions).toHaveLength(1);
    expect(exclusions[0].reason).toMatch(/rouleau/i);
    expect(exclusions[0].warning).toBeFalsy(); // règle explicite trouvée, pas un repli incertain
  });

  it("la règle rouleau/découpe ne s'applique pas si le lookup ne couvre qu'un seul des deux prix", () => {
    // Le lookup connaît le prix rouleau mais pas de prix découpe pour cette
    // réf (ex. désignation source non reconnue) : pas de règle applicable,
    // repli sur la première occurrence + WARNING, comme sans lookup.
    const lookup: ConditionnementLookup = new Map([
      ["DUP2", { rouleauPrixCents: 100, decoupePrixCents: null }],
    ]);
    const input = [
      produit({
        slug: "a",
        variantes: [
          variante({ ref_apf: "DUP2", prix_public_ht_cents: 999 }),
          variante({ ref_apf: "DUP2", prix_public_ht_cents: 100 }),
        ],
      }),
    ];

    const { produits, exclusions } = dedupeVariants(input, lookup);

    expect(produits[0].variantes).toHaveLength(1);
    expect(produits[0].variantes[0].prix_public_ht_cents).toBe(999); // 1ère occurrence, pas la 6380-like
    expect(exclusions[0].warning).toBe(true);
  });
});

describe("buildConditionnementLookup", () => {
  it("associe le prix rouleau (désignation Rouleau, unité m2) et le prix découpe (désignation découpe) pour un même ref_apf", () => {
    const records: CatalogRawRecord[] = [
      rawRecord({
        ref_apf: "D40320PB1",
        designation_brute: "Alkorplan 18/10 antidérapant Persia bleu - Rouleau de 12.6 m x 1.65 m",
        unite: "m2",
        prix_public_ht_cents: 6380,
      }),
      rawRecord({
        ref_apf: "D40320PB1",
        designation_brute: "Alkorplan 18/10 antidérapant Persia bleu - à la Decoupe 1m mini soit 1,65m², le ml",
        unite: "ml",
        prix_public_ht_cents: 8370,
      }),
    ];

    const lookup = buildConditionnementLookup(records);

    expect(lookup.get("D40320PB1")).toEqual({ rouleauPrixCents: 6380, decoupePrixCents: 8370 });
  });

  it("reconnaît « découpe » avec ou sans accent", () => {
    const records: CatalogRawRecord[] = [
      rawRecord({ ref_apf: "REF-A", designation_brute: "Produit - à la découpe, le ml", unite: "ml", prix_public_ht_cents: 50 }),
      rawRecord({ ref_apf: "REF-B", designation_brute: "Produit - à la Decoupe, le ml", unite: "ml", prix_public_ht_cents: 50 }),
    ];

    const lookup = buildConditionnementLookup(records);

    expect(lookup.get("REF-A")?.decoupePrixCents).toBe(50);
    expect(lookup.get("REF-B")?.decoupePrixCents).toBe(50);
  });

  it("ignore les lignes qui ne sont ni rouleau ni découpe (accessoires vendus au ml nativement)", () => {
    const records: CatalogRawRecord[] = [
      rawRecord({ ref_apf: "PROFIL-1", designation_brute: "Hung PVC horizontal - Baguette 2 m", unite: "ml", prix_public_ht_cents: 300 }),
    ];

    const lookup = buildConditionnementLookup(records);

    expect(lookup.has("PROFIL-1")).toBe(false);
  });
});

describe("resolveVariantVisibility", () => {
  it("force is_active=false pour un coloris null sur un produit MEMBRANE", () => {
    const p = produit({ type: "membrane" });
    const result = resolveVariantVisibility(p, variante({ coloris: null }));
    expect(result.isActive).toBe(false);
    expect(result.reasons.join()).toMatch(/coloris manquant/);
  });

  it("force is_active=false pour un coloris null sur un produit PVC-LIQUIDE", () => {
    const p = produit({ type: "pvc-liquide" });
    const result = resolveVariantVisibility(p, variante({ coloris: null }));
    expect(result.isActive).toBe(false);
  });

  it("NE force PAS is_active=false pour un coloris null sur un ACCESSOIRE (structurellement sans coloris)", () => {
    const p = produit({ type: "accessoire" });
    const result = resolveVariantVisibility(p, variante({ coloris: null }));
    expect(result.isActive).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("force is_active=false si le coloris contient un token interdit, quel que soit le type", () => {
    const p = produit({ type: "accessoire" });
    const result = resolveVariantVisibility(p, variante({ coloris: "gamme zolvex premium" }));
    expect(result.isActive).toBe(false);
    expect(result.reasons.join()).toMatch(/token fournisseur/);
  });

  it("force is_active=false pour la réf D41612B (unité provisoirement fausse)", () => {
    const p = produit();
    const result = resolveVariantVisibility(p, variante({ ref_apf: "D41612B", coloris: "BLANC" }));
    expect(result.isActive).toBe(false);
    expect(result.reasons.join()).toMatch(/unité provisoirement fausse/);
  });

  it("laisse actif un accessoire normal sans coloris ni token ni réf problématique", () => {
    const p = produit({ type: "accessoire" });
    const result = resolveVariantVisibility(p, variante({ ref_apf: "D99999XX", coloris: null }));
    expect(result.isActive).toBe(true);
  });
});

describe("resolveProductStatut", () => {
  function visible(): VariantVisibility {
    return { isActive: true, reasons: [] };
  }
  function hidden(reason = "raison de test"): VariantVisibility {
    return { isActive: false, reasons: [reason] };
  }

  it("bascule un produit publié en brouillon si toutes ses variantes sont supprimées", () => {
    const result = resolveProductStatut("publie", [hidden(), hidden()]);
    expect(result).toEqual({ statut: "brouillon", cascaded: true });
  });

  it("garde un produit publié si au moins une variante reste active", () => {
    const result = resolveProductStatut("publie", [hidden(), visible()]);
    expect(result).toEqual({ statut: "publie", cascaded: false });
  });

  it("un produit déjà brouillon dans le JSON (flag Alkorplan) le reste, cascade ou non", () => {
    expect(resolveProductStatut("brouillon", [visible()])).toEqual({
      statut: "brouillon",
      cascaded: false,
    });
    expect(resolveProductStatut("brouillon", [hidden()])).toEqual({
      statut: "brouillon",
      cascaded: false,
    });
  });
});
