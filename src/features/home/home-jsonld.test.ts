import { describe, expect, it } from "vitest";
import { containsForbiddenToken } from "@/lib/blind-shipping";
import { SITE_BRAND } from "@/lib/seo/site-url";
import { buildFaqPageJsonLd, buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";
import { HOME_FAQ_ITEMS } from "./faq-data";

/**
 * JSON-LD homepage (30, SEO machine) : Organization (app/layout.tsx),
 * WebSite + FAQPage (app/page.tsx). Mêmes assertions que
 * `product-jsonld.test.ts` (27/29) — tokens de test injectés par
 * `tests/setup.ts` (BLIND_SHIPPING_DENYLIST).
 */
describe("JSON-LD homepage — garde blind shipping (27), SEO machine (30)", () => {
  const serialized = JSON.stringify([
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildFaqPageJsonLd(HOME_FAQ_ITEMS),
  ]);

  it("aucun token de la denylist blind shipping (D10) dans le JSON-LD sérialisé", () => {
    expect(containsForbiddenToken(serialized)).toBe(false);
    expect(serialized.toLowerCase()).not.toContain("zolvex");
    expect(serialized.toLowerCase()).not.toContain("brumanor");
  });

  it("ne contient ni `manufacturer`, ni `AggregateRating`, ni `brand`/`seller` externe", () => {
    expect(serialized).not.toContain("manufacturer");
    expect(serialized).not.toContain("AggregateRating");
    expect(serialized).not.toMatch(/"brand"/);
    expect(serialized).not.toMatch(/"seller"/);
  });

  it("Organization/WebSite portent SITE_BRAND, jamais un nom d'entité externe", () => {
    expect(buildOrganizationJsonLd().name).toBe(SITE_BRAND);
    expect(buildWebsiteJsonLd().name).toBe(SITE_BRAND);
  });

  it("FAQPage : une entrée `mainEntity` par question, texte de réponse non vide", () => {
    const faqJsonLd = buildFaqPageJsonLd(HOME_FAQ_ITEMS);
    expect(faqJsonLd.mainEntity).toHaveLength(HOME_FAQ_ITEMS.length);
    for (const entity of faqJsonLd.mainEntity) {
      expect(entity.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });
});
