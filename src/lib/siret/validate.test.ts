import { describe, expect, it } from "vitest";
import { validateSiret } from "./validate";

// SIRET valides connus (clé de Luhn correcte) — établissements publics,
// données publiques INSEE couramment utilisées comme fixtures de test.
const VALID_SIRET = "73282932000074"; // Direction générale des finances publiques

describe("validateSiret", () => {
  it("accepte un SIRET valide (14 chiffres, clé de Luhn correcte)", () => {
    expect(validateSiret(VALID_SIRET)).toEqual({ valid: true, cleaned: VALID_SIRET });
  });

  it("nettoie les espaces avant validation", () => {
    expect(validateSiret("732 829 320 00074")).toEqual({ valid: true, cleaned: VALID_SIRET });
  });

  it("rejette une longueur incorrecte (13 chiffres)", () => {
    const result = validateSiret("7328293200007");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Le SIRET doit comporter exactement 14 chiffres.");
  });

  it("rejette une longueur incorrecte (15 chiffres)", () => {
    const result = validateSiret("732829320000740");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Le SIRET doit comporter exactement 14 chiffres.");
  });

  it("rejette les caractères non numériques", () => {
    const result = validateSiret("7328293200007A");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Le SIRET doit comporter exactement 14 chiffres.");
  });

  it("rejette une clé de Luhn incorrecte (dernier chiffre altéré)", () => {
    const result = validateSiret("73282932000075");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Ce SIRET est invalide (clé de contrôle incorrecte).");
  });

  it("rejette une chaîne vide", () => {
    const result = validateSiret("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Le SIRET doit comporter exactement 14 chiffres.");
  });
});
