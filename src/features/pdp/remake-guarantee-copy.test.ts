import { describe, expect, it } from "vitest";
import { getRemakeGuaranteeCopy } from "./remake-guarantee-copy";

describe("getRemakeGuaranteeCopy", () => {
  it("off : découpe sur mesure, non reprise", () => {
    expect(getRemakeGuaranteeCopy("off")).toBe("Découpe sur mesure — non repris.");
  });

  it("material-only : reprise, matière facturée", () => {
    expect(getRemakeGuaranteeCopy("material-only")).toBe(
      "Erreur de cote ? On refait, vous payez la matière.",
    );
  });

  it("full : reprise complète", () => {
    expect(getRemakeGuaranteeCopy("full")).toBe("Erreur de cote ? On refait.");
  });

  it("valeur absente : repli sur off", () => {
    expect(getRemakeGuaranteeCopy(undefined)).toBe("Découpe sur mesure — non repris.");
  });

  it("valeur inconnue : repli sur off, jamais une erreur", () => {
    expect(getRemakeGuaranteeCopy("full-refund-plus-bonus")).toBe(
      "Découpe sur mesure — non repris.",
    );
  });
});
