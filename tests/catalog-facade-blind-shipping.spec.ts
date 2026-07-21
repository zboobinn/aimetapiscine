import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { matchesAggressiveSubstring, matchesWholeWord } from "@/lib/blind-shipping";
import { catalogFacadeFileSchema, type CatalogFacadeProduit } from "../scripts/apf/catalog-facade.schema";

/**
 * Étape 3 (identité produit) — vérifie que data/apf/catalog-facade.json ne
 * laisse fuiter aucun token fournisseur dans un champ CLIENT.
 *
 * Réutilise les passes 2 et 3 du détecteur trois-passes de la spec 27
 * (`matchesWholeWord`, `matchesAggressiveSubstring`, `src/lib/blind-shipping.ts`)
 * plutôt que de réimplémenter la logique de matching. Ce fichier NE PASSE
 * PAS par `containsForbiddenToken()`/`BLIND_SHIPPING_DENYLIST` (l'env var
 * global de `tests/setup.ts` porte une denylist FACTICE pour les autres
 * suites) : la vraie denylist catalogue est déclarée ici en dur, et scindée
 * en tokens mono-mot avant matching (règle D11 de src/lib/blind-shipping.ts :
 * un token multi-mots comme "POOL DESIGN" doit être décomposé, n'importe
 * quel mot suffit à déclencher la détection).
 *
 * Liste étendue au bloc #36 (mapping-familles.md, ligne 14 + note du bloc
 * #36) : HYDROFLEX/ALKORPLAN/RENOLIT/POOL DESIGN/APF (denylist façade
 * générale) + ALKORGLUE/ALKORPLUS/ALKORCHEM/ALKORCLEAN/HYDROGLUE (marques
 * produit APF réécrites spécifiquement dans le bloc #36). Bostik n'en fait
 * PAS partie : marque tierce affichée littéralement (décision actée).
 */

const REAL_SUPPLIER_DENYLIST = [
  "HYDROFLEX",
  "POOL DESIGN",
  "ALKORPLAN",
  "RENOLIT",
  "APF",
  "ALKORGLUE",
  "ALKORPLUS",
  "ALKORCHEM",
  "ALKORCLEAN",
  "HYDROGLUE",
];

function containsAnyDenylistToken(input: string, tokens: string[]): boolean {
  return tokens.some((rawToken) => {
    const words = rawToken.trim().split(/\s+/).filter(Boolean);
    return words.some((word) => matchesWholeWord(input, word) || matchesAggressiveSubstring(input, word));
  });
}

const CLIENT_FIELD_NAMES = ["slug", "nom_affiche", "type"] as const;

function collectClientFields(produits: CatalogFacadeProduit[]): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  for (const produit of produits) {
    for (const fieldName of CLIENT_FIELD_NAMES) {
      fields.push({ label: `${produit.slug}.${fieldName}`, value: produit[fieldName] });
    }
    for (const [index, variante] of produit.variantes.entries()) {
      if (variante.coloris !== null) {
        fields.push({ label: `${produit.slug}.variantes[${index}].coloris`, value: variante.coloris });
      }
    }
  }
  return fields;
}

describe("détecteur blind-shipping catalogue — auto-validation (stub-first)", () => {
  // Ces tests ne lisent PAS catalog-facade.json : ils prouvent d'abord que
  // `containsAnyDenylistToken` détecte bien un contenu piégé synthétique.
  // Si on casse le détecteur (ex. liste de tokens vide, passe désactivée),
  // ces tests doivent tomber au rouge — c'est la garantie qu'ils ne sont pas
  // des no-ops avant de leur faire confiance sur le vrai fichier.

  it("détecte un token en mot entier, insensible à la casse et aux accents", () => {
    expect(containsAnyDenylistToken("Membrane Hydroflex premium", REAL_SUPPLIER_DENYLIST)).toBe(true);
    expect(containsAnyDenylistToken("gamme ALKORPLAN essentielle", REAL_SUPPLIER_DENYLIST)).toBe(true);
  });

  it("détecte un token multi-mots via n'importe lequel de ses mots (D11)", () => {
    expect(containsAnyDenylistToken("fabriqué par Pool Design", REAL_SUPPLIER_DENYLIST)).toBe(true);
    // "POOL DESIGN" est scindé en tokens mono-mot indépendants (D11) : le
    // mot "Design" seul suffit à déclencher, même sans "Pool" à côté.
    expect(containsAnyDenylistToken("un beau Design de piscine", ["POOL DESIGN"])).toBe(true);
  });

  it("détecte un token noyé dans un mot plus long (passe 3, substring agressif, ≥5 car.)", () => {
    expect(containsAnyDenylistToken("membranehydroflexpro", REAL_SUPPLIER_DENYLIST)).toBe(true);
    expect(containsAnyDenylistToken("x.y.hydroflex.z", REAL_SUPPLIER_DENYLIST)).toBe(true);
  });

  it("faux positif attendu : APF (3 car.) ne matche PAS en substring agressif, seulement en mot entier", () => {
    // Exemple canonique de la spec 27 : un token court ne doit jamais
    // matcher en substring noyé, seulement comme mot isolé.
    expect(containsAnyDenylistToken("apfelstrudel", REAL_SUPPLIER_DENYLIST)).toBe(false);
    expect(containsAnyDenylistToken("un devis APF envoyé", REAL_SUPPLIER_DENYLIST)).toBe(true);
  });

  it("ne matche aucun des 20 mots français / marques légitimes du secteur", () => {
    const legitimate = [
      "membrane",
      "piscine",
      "renforcée",
      "antidérapante",
      "premium",
      "essentielle",
      "confort",
      "nacrée",
      "vernie",
      "lisse",
      "accessoire",
      "profilé",
      "jonc",
      "feutre",
      "colle",
      "mastic",
      "coloris",
      "bleu",
      "sable",
      "olive",
      "Cordivari",
      "Desjoyaux",
      "Waterair",
      "Piscinelle",
      "Diffazur",
    ];
    for (const word of legitimate) {
      expect(containsAnyDenylistToken(word, REAL_SUPPLIER_DENYLIST)).toBe(false);
    }
  });

  it("Bostik est une marque tierce AUTORISÉE — jamais traitée comme un token interdit", () => {
    expect(containsAnyDenylistToken("Bostik", REAL_SUPPLIER_DENYLIST)).toBe(false);
    expect(containsAnyDenylistToken("Colle Bostik 1220 (nitrile)", REAL_SUPPLIER_DENYLIST)).toBe(false);
    expect(containsAnyDenylistToken("colle-bostik-1220", REAL_SUPPLIER_DENYLIST)).toBe(false);
  });
});

describe("catalog-facade.json — zéro fuite fournisseur dans les champs client", () => {
  const rawFile = readFileSync(join(process.cwd(), "data", "apf", "catalog-facade.json"), "utf-8");
  const produits = catalogFacadeFileSchema.parse(JSON.parse(rawFile));

  it("le fichier n'est pas vide (le test suivant ne serait pas significatif sinon)", () => {
    expect(produits.length).toBeGreaterThan(0);
  });

  it("aucun token de la denylist fournisseur dans slug / nom_affiche / type / coloris", () => {
    const fields = collectClientFields(produits);
    const violations = fields.filter((f) => containsAnyDenylistToken(f.value, REAL_SUPPLIER_DENYLIST));

    expect(
      violations,
      violations.length > 0
        ? `Champ(s) client piégé(s) — à corriger dans le dictionnaire (mapping-familles.md), pas dans le script :\n` +
            violations.map((v) => `  - ${v.label} = "${v.value}"`).join("\n")
        : undefined,
    ).toEqual([]);
  });

  it("Bostik apparaît en clair dans les champs client (bloc #36) sans être flaggé", () => {
    const fields = collectClientFields(produits);
    const bostikFields = fields.filter((f) => /bostik/i.test(f.value));

    // Si cette liste est vide, le test ci-dessous ne prouverait rien : on
    // vérifie d'abord que la fixture contient bien du Bostik en clair.
    expect(bostikFields.length).toBeGreaterThan(0);
    for (const field of bostikFields) {
      expect(containsAnyDenylistToken(field.value, REAL_SUPPLIER_DENYLIST)).toBe(false);
    }
  });

  it("ref_apf est présent (server-only) mais n'apparaît dans AUCUN champ client sérialisé", () => {
    const allRefs = produits.flatMap((p) => p.variantes.map((v) => v.ref_apf));
    expect(allRefs.length).toBeGreaterThan(0); // la donnée server-only existe bien

    const serializedClientFields = collectClientFields(produits)
      .map((f) => f.value)
      .join(" | ");

    for (const ref of allRefs) {
      expect(serializedClientFields.toUpperCase()).not.toContain(ref.toUpperCase());
    }
  });
});
