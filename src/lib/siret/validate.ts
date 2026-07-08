/**
 * Validation de FORMAT d'un SIRET (14 chiffres + clé de Luhn), pure et sans
 * dépendance réseau — utilisable côté client (retour immédiat dans le
 * formulaire) ET côté serveur (revalidation avant écriture, 23 : ne jamais
 * faire confiance à la validation client seule). Ne dit rien sur
 * l'EXISTENCE du SIRET : ça, c'est le rôle de `lib/insee/verify-siret.ts`.
 */

export interface SiretValidation {
  valid: boolean;
  /** SIRET nettoyé (espaces retirés), utilisable tel quel si `valid`. */
  cleaned: string;
  error?: string;
}

function luhnChecksumValid(digits: string): boolean {
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

export function validateSiret(rawSiret: string): SiretValidation {
  const cleaned = rawSiret.replace(/\s+/g, "");

  if (!/^\d{14}$/.test(cleaned)) {
    return { valid: false, cleaned, error: "Le SIRET doit comporter exactement 14 chiffres." };
  }

  if (!luhnChecksumValid(cleaned)) {
    return { valid: false, cleaned, error: "Ce SIRET est invalide (clé de contrôle incorrecte)." };
  }

  return { valid: true, cleaned };
}
