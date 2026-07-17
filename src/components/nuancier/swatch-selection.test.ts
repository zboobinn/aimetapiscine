import { describe, expect, it } from "vitest";
import {
  computeNextSwatchIndex,
  isSwatchGroupControlled,
  resolveActiveSelectedId,
  resolveInitialSelectedId,
} from "./swatch-selection";

const OPTIONS = [{ id: "bleu" }, { id: "nuage" }, { id: "gris-anthracite" }];

describe("resolveInitialSelectedId", () => {
  it("retient defaultSelectedId quand fourni", () => {
    expect(resolveInitialSelectedId(OPTIONS, "nuage")).toBe("nuage");
  });

  it("replie sur la première option sans defaultSelectedId", () => {
    expect(resolveInitialSelectedId(OPTIONS)).toBe("bleu");
  });

  it("aucune option : undefined, jamais une erreur", () => {
    expect(resolveInitialSelectedId([])).toBeUndefined();
  });
});

describe("isSwatchGroupControlled", () => {
  it("undefined => mode non contrôlé", () => {
    expect(isSwatchGroupControlled(undefined)).toBe(false);
  });

  it("une chaîne définie => mode contrôlé, même si elle correspond à l'option par défaut", () => {
    expect(isSwatchGroupControlled("bleu")).toBe(true);
  });
});

describe("resolveActiveSelectedId", () => {
  it("mode contrôlé : le prop prime toujours sur l'état interne", () => {
    expect(resolveActiveSelectedId("nuage", "bleu")).toBe("nuage");
  });

  it("mode non contrôlé (selectedId undefined) : replie sur l'état interne", () => {
    expect(resolveActiveSelectedId(undefined, "bleu")).toBe("bleu");
  });
});

describe("computeNextSwatchIndex", () => {
  it("avance d'un cran", () => {
    expect(computeNextSwatchIndex(0, 1, OPTIONS.length)).toBe(1);
  });

  it("recule d'un cran", () => {
    expect(computeNextSwatchIndex(1, -1, OPTIONS.length)).toBe(0);
  });

  it("boucle en avant depuis le dernier index", () => {
    expect(computeNextSwatchIndex(OPTIONS.length - 1, 1, OPTIONS.length)).toBe(0);
  });

  it("boucle en arrière depuis le premier index", () => {
    expect(computeNextSwatchIndex(0, -1, OPTIONS.length)).toBe(OPTIONS.length - 1);
  });
});
