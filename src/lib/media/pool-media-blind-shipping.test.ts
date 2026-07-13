import { describe, expect, it } from "vitest";

import { containsForbiddenToken } from "@/lib/blind-shipping";
import { poolMediaManifest } from "./pool-media";

/**
 * Blind shipping sur les chemins média (27) : convention de nommage propre
 * dès maintenant, avant même l'arrivée des vrais fichiers (annexe-brief-photo,
 * nommage `{coloris}-{plan}.jpg`). Réutilise la même détection à trois passes
 * que le reste du projet (`src/lib/blind-shipping.ts`).
 */
describe("pool-media — aucun token blind shipping dans les chemins (27)", () => {
  it("aucun src du manifeste ne contient un token de la denylist", () => {
    for (const [colorisSlug, entry] of Object.entries(poolMediaManifest)) {
      for (const [plan, image] of Object.entries(entry.plans)) {
        expect(containsForbiddenToken(image.src), `${colorisSlug}/${plan}`).toBe(false);
      }
    }
  });
});
