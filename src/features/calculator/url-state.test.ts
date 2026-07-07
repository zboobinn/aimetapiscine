import { describe, expect, it } from "vitest";
import { parseCalculatorState, serializeCalculatorState } from "./url-state";

describe("serializeCalculatorState / parseCalculatorState", () => {
  it("fait un aller-retour fidèle", () => {
    const state = {
      input: {
        pool: { shape: "rectangle" as const, dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "roman" as const,
      },
      membraneSlug: "membrane-armee-uni-bleu",
    };

    const params = serializeCalculatorState(state);
    const parsed = parseCalculatorState(params);

    expect(parsed).toEqual(state);
  });

  it("génère l'URL décrite par la spec 08", () => {
    const params = serializeCalculatorState({
      input: {
        pool: { shape: "rectangle", dimensions: { length: 8, width: 4, depth: 1.5 } },
        stairType: "roman",
      },
    });

    expect(params.get("l")).toBe("8");
    expect(params.get("w")).toBe("4");
    expect(params.get("d")).toBe("1.5");
    expect(params.get("stairs")).toBe("roman");
    expect(params.has("membrane")).toBe(false);
  });

  it("retourne null si une dimension dépasse les bornes réalistes", () => {
    const params = new URLSearchParams({ shape: "rectangle", l: "30", w: "4", d: "1.5", stairs: "aucun" });
    expect(parseCalculatorState(params)).toBeNull();
  });

  it("retourne null si des paramètres obligatoires sont absents", () => {
    const params = new URLSearchParams({ shape: "rectangle", l: "8" });
    expect(parseCalculatorState(params)).toBeNull();
  });

  it("retourne null pour un type d'escalier inconnu", () => {
    const params = new URLSearchParams({
      shape: "rectangle",
      l: "8",
      w: "4",
      d: "1.5",
      stairs: "inexistant",
    });
    expect(parseCalculatorState(params)).toBeNull();
  });
});
