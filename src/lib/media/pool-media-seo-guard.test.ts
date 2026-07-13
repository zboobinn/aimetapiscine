import { describe, expect, it } from "vitest";

import { getSiteEnv } from "@/lib/env";
import { poolMediaManifest } from "./pool-media";

/**
 * Garde-fou anti-placeholder-en-prod (A3, docs/decisions.md — rend le
 * critère exécutable) : si l'indexation est explicitement autorisée
 * (`SEO_ALLOW_INDEXING=true`, 18/26), aucune entrée du manifeste média ne
 * doit rester un placeholder. Défaut `false` → ce test passe aujourd'hui,
 * même avec un manifeste 100 % placeholder.
 */
describe("pool-media — garde-fou anti-placeholder en prod (A3)", () => {
  it("aucune entrée placeholder ne subsiste si SEO_ALLOW_INDEXING=true", () => {
    const { SEO_ALLOW_INDEXING } = getSiteEnv();

    if (!SEO_ALLOW_INDEXING) {
      // Défaut : rien à vérifier, le verrou n'est pas armé.
      return;
    }

    for (const [colorisSlug, entry] of Object.entries(poolMediaManifest)) {
      expect(entry.placeholder, `coloris "${colorisSlug}"`).toBe(false);
    }
  });
});
