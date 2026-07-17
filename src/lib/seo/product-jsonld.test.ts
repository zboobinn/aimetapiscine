import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { SITE_BRAND } from "@/lib/seo/site-url";
import { buildProductJsonLd } from "./product-jsonld";

const PRODUIT: Pick<CatalogEntry, "slug" | "name" | "description" | "image" | "in_stock"> = {
  slug: "membrane-uni-bleu",
  name: "Membrane armée Uni — Bleu",
  description: "Membrane armée 1,5 mm, coloris bleu.",
  image: "/media/placeholders/bleu-bassin.svg",
  in_stock: true,
};

describe("buildProductJsonLd — garde blind shipping (27), PDP (29)", () => {
  it("ne contient ni `manufacturer` ni un token fournisseur dans le JSON sérialisé", () => {
    const jsonLd = buildProductJsonLd({
      produit: PRODUIT,
      canonicalUrl: "https://armapool.fr/membrane-armee/uni/bleu",
      publicTtcCents: 294000,
      revalidateSeconds: 3600,
    });

    const serialized = JSON.stringify(jsonLd);

    expect(serialized).not.toContain("manufacturer");
    expect(Object.keys(jsonLd)).not.toContain("manufacturer");
    // Tokens de test injectés par tests/setup.ts (BLIND_SHIPPING_DENYLIST).
    expect(serialized.toLowerCase()).not.toContain("zolvex");
    expect(serialized.toLowerCase()).not.toContain("brumanor");
  });

  it("brand/seller sont toujours SITE_BRAND — jamais un nom d'entité externe", () => {
    const jsonLd = buildProductJsonLd({
      produit: PRODUIT,
      canonicalUrl: "https://armapool.fr/membrane-armee/uni/bleu",
      publicTtcCents: 294000,
      revalidateSeconds: 3600,
    });

    expect(jsonLd.brand).toEqual({ "@type": "Brand", name: SITE_BRAND });
    expect(jsonLd.seller).toEqual({ "@type": "Organization", name: SITE_BRAND });
  });
});
