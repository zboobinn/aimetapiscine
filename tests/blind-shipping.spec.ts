import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import { ApiErrorCode } from "@/lib/api/errors";
import { apiError } from "@/lib/api/response";
import { assertBlindSafe, containsForbiddenToken, sanitizePublicField } from "@/lib/blind-shipping";
import { catalogFileSchema } from "@/lib/catalog/schema";
import { sanitizeProductImage, UnsafeUploadError } from "@/lib/images/sanitize";
import { buildProductJsonLd, type ProductJsonLd } from "@/lib/seo/product-jsonld";
import { SITE_BRAND } from "@/lib/seo/site-url";

/**
 * Spec 27 — les 6 vecteurs de fuite blind-shipping restant ouverts sur le
 * front public. Le token de la denylist ("zolvex"/"brumanor") est FACTICE,
 * injecté par `tests/setup.ts` via `BLIND_SHIPPING_DENYLIST` — ce fichier ne
 * contient jamais la vraie liste, qui ne vit que dans l'environnement
 * serveur réel.
 */

function buildValidCatalogProduct(overrides: Record<string, unknown> = {}) {
  return {
    sku: "stub-sku-1",
    slug: "stub-slug-1",
    name: "Feutre de protection 300g",
    category: "AUTRE",
    description: "Feutre de protection pour membrane armée.",
    base_price_ht: 1000,
    pro_price_ht: null,
    vat_rate: 2000,
    weight_grams: 500,
    roll_area_m2: null,
    unit: "unite",
    coverage: { m2_per_unit: 1 },
    image: "/products/stub-slug-1.jpg",
    in_stock: true,
    ...overrides,
  };
}

describe("vecteur 1 — métadonnées EXIF/IPTC/XMP des images produit", () => {
  it("une image dont l'EXIF Copyright contient un token interdit ressort sans aucune métadonnée", async () => {
    const taintedSource = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .withMetadata({ exif: { IFD0: { Copyright: "Photo (c) Zolvex — ne pas diffuser" } } })
      .jpeg()
      .toBuffer();

    // Vérifie que la fixture est bien piégée avant de tester la protection.
    // `metadata().exif` est le segment EXIF brut (Buffer) : décoder en latin1
    // pour lire le texte Copyright inséré ci-dessus (JSON.stringify(Buffer)
    // ne donne qu'un tableau d'octets, jamais le texte lisible).
    const taintedMetadata = await sharp(taintedSource).metadata();
    expect(taintedMetadata.exif?.toString("latin1")).toMatch(/zolvex/i);

    const result = await sanitizeProductImage({
      buffer: taintedSource,
      originalFilename: "photo-piscine.jpg",
      slug: "membrane-armee-uni-bleu",
      coloris: "bleu",
      index: 1,
    });

    for (const buffer of [
      result.avif.large,
      result.avif.small,
      result.webp.large,
      result.webp.small,
    ]) {
      const metadata = await sharp(buffer).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(JSON.stringify(metadata)).not.toMatch(/zolvex/i);
    }
  });
});

describe("vecteur 2 — nom de fichier des uploads", () => {
  it("un nom de fichier contenant un token est rejeté avec le bon code d'erreur", async () => {
    const cleanSource = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    await expect(
      sanitizeProductImage({
        buffer: cleanSource,
        originalFilename: "export-zolvex-2026.jpg",
        slug: "membrane-armee-uni-bleu",
        coloris: "bleu",
        index: 1,
      }),
    ).rejects.toMatchObject({ code: ApiErrorCode.UNSAFE_CONTENT });

    await expect(
      sanitizeProductImage({
        buffer: cleanSource,
        originalFilename: "export-zolvex-2026.jpg",
        slug: "membrane-armee-uni-bleu",
        coloris: "bleu",
        index: 1,
      }),
    ).rejects.toBeInstanceOf(UnsafeUploadError);
  });

  it("le message d'erreur et le corps de réponse API restent opaques (jamais le token ni le nom de fichier)", async () => {
    const cleanSource = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    try {
      await sanitizeProductImage({
        buffer: cleanSource,
        originalFilename: "export-zolvex-2026.jpg",
        slug: "membrane-armee-uni-bleu",
        coloris: "bleu",
        index: 1,
      });
      throw new Error("sanitizeProductImage aurait dû rejeter ce nom de fichier");
    } catch (error) {
      expect(error).toBeInstanceOf(UnsafeUploadError);
      const message = (error as Error).message;
      expect(message).toBe("Nom de fichier refusé");
      expect(message).not.toMatch(/zolvex/i);
      expect(message).not.toMatch(/export-zolvex-2026/i);
    }

    const response = apiError(ApiErrorCode.UNSAFE_CONTENT, "Nom de fichier refusé");
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/zolvex/i);
    expect(body.error.message).toBe("Nom de fichier refusé");
  });
});

describe("vecteur 3 — garde sur les champs textuels publics (alt, titre, description, coloris)", () => {
  it("un alt piégé retourne le repli et ne throw jamais", () => {
    const tainted = "Vue rapprochée du carton Zolvex, ne pas montrer au client";

    expect(() => sanitizePublicField(tainted, "product-alt", "Photo du produit")).not.toThrow();
    expect(sanitizePublicField(tainted, "product-alt", "Photo du produit")).toBe("Photo du produit");
  });

  it("un texte propre traverse sans modification", () => {
    const clean = "Membrane armée bleu piscine, aspect uni, 150/100e.";
    expect(sanitizePublicField(clean, "product-description", "Description indisponible")).toBe(clean);
  });

  it("ne logge jamais le contenu fautif ni le token qui a matché (Amendement 1)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tainted = "Colis envoyé par Zolvex, référence interne 12345";

    sanitizePublicField(tainted, "avis-texte", "Contenu masqué", { entityId: "avis-42" });

    // Preuve que ce test n'est plus vacuité (étape 1) : la vraie détection
    // logge désormais au moins un appel.
    expect(spy.mock.calls.length).toBeGreaterThan(0);

    for (const call of spy.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toMatch(/zolvex/i);
      expect(serialized).not.toMatch(/12345/);
    }

    spy.mockRestore();
  });
});

describe("vecteur 4 — brand/manufacturer/seller dans le JSON-LD produit", () => {
  const taintedProduit = {
    slug: "membrane-armee-uni-bleu",
    name: "Membrane Zolvex uni bleu",
    description: "Fabriqué par Brumanor, distribué sous licence Zolvex.",
    image: "/products/membrane-armee-uni-bleu.jpg",
    in_stock: true,
  };

  it("ne contient jamais de clé manufacturer et brand.name/seller.name restent figés, quel que soit l'input", () => {
    const jsonLd = buildProductJsonLd({
      produit: taintedProduit,
      canonicalUrl: "https://armapool.fr/membrane-armee/uni/bleu",
      publicTtcCents: 12900,
      revalidateSeconds: 3600,
    });

    expect(jsonLd).not.toHaveProperty("manufacturer");
    expect(jsonLd.brand).toEqual({ "@type": "Brand", name: SITE_BRAND });
    expect(jsonLd.seller).toEqual({ "@type": "Organization", name: SITE_BRAND });

    const serialized = JSON.stringify(jsonLd);
    expect(serialized).not.toMatch(/zolvex/i);
    expect(serialized).not.toMatch(/brumanor/i);
  });

  it("assertBlindSafe rejette une chaîne qui contiendrait malgré tout un token avant injection", () => {
    expect(() => assertBlindSafe("mention Zolvex oubliée", "product-jsonld")).toThrow();
    expect(() => assertBlindSafe("rien à signaler ici", "product-jsonld")).not.toThrow();
  });

  it("garde de TYPE (Amendement 3) : `manufacturer` doit être inexprimable sur ProductJsonLd — validé par `pnpm typecheck`, pas par vitest", () => {
    // `manufacturer` ne doit pas pouvoir apparaître sur le type de retour de
    // `buildProductJsonLd` (garde de type, pas de test). Si la ligne
    // `manufacturer:` ci-dessous compile (pas d'erreur TS à supprimer),
    // `pnpm typecheck` remonte "Unused '@ts-expect-error' directive" : c'est
    // le signal rouge attendu tant que le vrai type n'est pas posé.
    const invalid: ProductJsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": "x",
      name: "x",
      description: "x",
      image: "x",
      sku: "x",
      brand: { "@type": "Brand", name: SITE_BRAND },
      seller: { "@type": "Organization", name: SITE_BRAND },
      // @ts-expect-error — `manufacturer` n'existe pas sur `ProductJsonLd`.
      manufacturer: { "@type": "Organization", name: "ne doit pas compiler" },
      offers: {
        "@type": "Offer",
        url: "x",
        priceCurrency: "EUR",
        price: "1.00",
        availability: "https://schema.org/InStock",
        priceValidUntil: "x",
      },
    };

    expect(invalid).toBeDefined();
  });
});

describe("vecteur 5 — photos et textes d'avis clients (détection, variantes)", () => {
  const variantes = [
    "Colis reçu de la part de ZOLVEX, très rapide",
    "Livré par zol.vex sans problème",
    "Le bordereau mentionnait zol-vex en gros",
    "z o l v e x écrit à la main sur le carton",
    "Reçu de Zôlvex, accent inclus",
    "  zolvex.  ",
  ];

  it.each(variantes)("détecte la variante obfusquée : %s", (texte) => {
    expect(containsForbiddenToken(texte)).toBe(true);
  });

  it("détecte le token mono-mot même entouré d'un sigle légal (\"Brumanor SCI\")", () => {
    expect(containsForbiddenToken("Expédié par Brumanor SCI la semaine dernière")).toBe(true);
  });

  it("Amendement 5 — \"brumanor scierie du sud\" DOIT matcher (le mot \"brumanor\" y apparaît entier)", () => {
    expect(containsForbiddenToken("Reçu depuis Brumanor scierie du sud, satisfait")).toBe(true);
  });

  // D11 — cas canoniques positifs pour le token court "zvx" (3 car., < 5) :
  // couverts par la passe 1 (collapse de lettres isolées) + passe 2 (frontières
  // de mot), jamais par la passe 3 (substring agressif), qui l'exclut.
  it.each(["ZVX", "z.v.x.", "z v x"])("D11 — le token court obfusqué « %s » DOIT matcher", (texte) => {
    expect(containsForbiddenToken(texte)).toBe(true);
  });

  // D13 — conflit tranché : un token ≥ 5 caractères est assez distinctif pour
  // que toute occurrence, même noyée dans un mot, soit intentionnelle. Déplacé
  // du vecteur 6 (faux positifs) : ce n'en est plus un, c'est une détection
  // positive attendue. "zolvex" (6 car.) et "brumanor" (8 car.) sont tous les
  // deux ≥ 5 → éligibles à la passe 3 (substring agressif), donc détectés même
  // sans séparateur.
  it("D13 — \"zolvexair\" DOIT matcher (token ≥ 5 car., substring agressif)", () => {
    expect(containsForbiddenToken("zolvexair")).toBe(true);
  });

  it("D13 — \"brumanoresque\" DOIT matcher (token ≥ 5 car., substring agressif)", () => {
    expect(containsForbiddenToken("brumanoresque")).toBe(true);
  });

  // D13 — correction de cohérence (non explicitement demandée, appliquée par
  // le même principe que "zolvexair") : "brumanor" fait 8 caractères, donc
  // "brumanorsciences" doit désormais matcher lui aussi, pour la même raison.
  // Ancien test (étape 1, attendait `false`) déplacé et inversé ici.
  it("D13 — \"brumanorsciences\" DOIT matcher (même principe que \"zolvexair\")", () => {
    expect(containsForbiddenToken("brumanorsciences")).toBe(true);
  });
});

describe("vecteur 6 — faux positifs", () => {
  const motsFrancais = [
    "piscine",
    "margelle",
    "liner",
    "escalier",
    "chlore",
    "filtration",
    "étanchéité",
    "coloris",
    "rouleau",
    "colle",
    "profilé",
    "solvant",
    "feutre",
    "bassin",
    "pompe",
    "skimmer",
    "revêtement",
    "installation",
    "garantie",
    "livraison",
  ];

  const marquesLegitimes = ["Piscinelle", "Diffazur", "Desjoyaux", "Waterair", "Caron"];

  it.each(motsFrancais)("le mot français « %s » ne matche pas", (mot) => {
    expect(containsForbiddenToken(mot)).toBe(false);
  });

  it.each(marquesLegitimes)("la marque légitime « %s » ne matche pas", (marque) => {
    expect(containsForbiddenToken(marque)).toBe(false);
  });

  // D13 tranche le conflit signalé à l'étape 2A : "zolvexair" et
  // "brumanorsciences" DOIVENT matcher (tokens ≥ 5 car.) — déplacés et
  // inversés dans le vecteur 5 ci-dessus, ce ne sont plus des faux positifs.

  // D11 — cas canoniques négatifs pour le token court "zvx" : la passe 3
  // (substring agressif) l'exclut (< 5 car.), donc ni la version collée à un
  // mot plausible ("zvxelstrudel") ni la version incluse dans un autre mot
  // ("capzvx", cf. "cap f" inchangé en passe 1) ne doivent matcher.
  it.each(["zvxelstrudel", "capzvx"])("D11 — « %s » NE DOIT PAS matcher (token court, hors passe 3)", (texte) => {
    expect(containsForbiddenToken(texte)).toBe(false);
  });

  // Contrôle positif : prouve que ce describe ne serait pas vert par simple
  // absence de détection généralisée — dans le même bloc, un cas qui DOIT
  // matcher est bien distingué des cas qui ne doivent pas matcher.
  it("contrôle positif — le token lui-même matche bien (\"zvx\")", () => {
    expect(containsForbiddenToken("zvx")).toBe(true);
  });
});

describe("Amendement 4 — deux régimes de protection distincts", () => {
  it("régime « donnée à nous, commitée » (catalog.json) : throw au chargement si un champ contient un token", () => {
    const taintedCatalog = {
      note: "fixture de test",
      products: [buildValidCatalogProduct({ name: "Feutre Zolvex 300g" })],
    };

    expect(() => catalogFileSchema.parse(taintedCatalog)).toThrow();
  });

  it("régime « donnée à nous, commitée » : un catalogue propre ne throw jamais", () => {
    const cleanCatalog = {
      note: "fixture de test",
      products: [buildValidCatalogProduct()],
    };

    expect(() => catalogFileSchema.parse(cleanCatalog)).not.toThrow();
  });

  it("régime « donnée saisie ailleurs » (Supabase éditable, avis 31) : sanitizePublicField, jamais de throw", () => {
    const tainted = "Avis client mentionnant Zolvex par erreur";
    expect(() => sanitizePublicField(tainted, "avis-texte", "Avis masqué")).not.toThrow();
    expect(sanitizePublicField(tainted, "avis-texte", "Avis masqué")).toBe("Avis masqué");
  });
});

/**
 * Critère de done (spec 27) — non-régression.
 *
 * Reprend les points du critère de done qui sont automatisables (les autres —
 * exécution manuelle de `scripts/resanitize-storage.ts`, inspection de l'URL
 * de suivi transporteur, entrée `decisions.md` — sont hors de portée d'un
 * test unitaire). Fait passer un jeu de données piégé à TOUTE la surface
 * couverte par cette spec en une seule fois (image + nom de fichier +
 * catalogue + JSON-LD) et vérifie qu'aucun artefact produit ne contient le
 * token — l'équivalent automatisé et permanent du `grep -ri` manuel du
 * critère de done, rejoué à chaque exécution de la suite plutôt qu'une fois
 * avant mise en prod.
 */
describe("critère de done (spec 27) — non-régression", () => {
  it("aucun artefact produit par le pipeline (image, catalogue, JSON-LD, erreurs) ne contient le token, même en entrée entièrement piégée", async () => {
    const artifacts: string[] = [];

    // 1. Image : EXIF piégé → sortie sans métadonnées.
    const taintedImage = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 5, g: 5, b: 5 } },
    })
      .withMetadata({ exif: { IFD0: { Copyright: "Zolvex Brumanor" } } })
      .jpeg()
      .toBuffer();

    const sanitizedImage = await sanitizeProductImage({
      buffer: taintedImage,
      originalFilename: "photo.jpg",
      slug: "produit-test",
      coloris: "bleu",
      index: 1,
    });

    for (const buffer of [
      sanitizedImage.avif.large,
      sanitizedImage.avif.small,
      sanitizedImage.webp.large,
      sanitizedImage.webp.small,
    ]) {
      const metadata = await sharp(buffer).metadata();
      artifacts.push(JSON.stringify(metadata));
    }
    artifacts.push(sanitizedImage.filename);

    // 2. Nom de fichier piégé → erreur opaque.
    try {
      await sanitizeProductImage({
        buffer: taintedImage,
        originalFilename: "export-brumanor-2026.jpg",
        slug: "produit-test",
        coloris: "bleu",
        index: 1,
      });
    } catch (error) {
      artifacts.push((error as Error).message);
    }

    // 3. Catalogue piégé → throw au chargement (le message d'erreur Zod lui-même
    // ne doit rien contenir de fautif : il ne cite jamais la valeur rejetée).
    try {
      catalogFileSchema.parse({
        note: "fixture",
        products: [buildValidCatalogProduct({ name: "Produit Zolvex Brumanor" })],
      });
    } catch (error) {
      artifacts.push((error as Error).message);
    }

    // 4. JSON-LD piégé.
    const jsonLd = buildProductJsonLd({
      produit: {
        slug: "produit-test",
        name: "Produit Zolvex",
        description: "Distribué par Brumanor.",
        image: "/products/produit-test.jpg",
        in_stock: true,
      },
      canonicalUrl: "https://armapool.fr/produit-test",
      publicTtcCents: 5000,
      revalidateSeconds: 3600,
    });
    artifacts.push(JSON.stringify(jsonLd));
    expect(jsonLd).not.toHaveProperty("manufacturer");

    const combined = artifacts.join("\n");
    expect(combined).not.toMatch(/zolvex/i);
    expect(combined).not.toMatch(/brumanor/i);
  });
});
