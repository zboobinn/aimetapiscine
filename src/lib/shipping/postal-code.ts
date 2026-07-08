/**
 * Classification des codes postaux français utile au calcul du port (12) :
 * Corse (surcoût transporteur) et DOM-TOM (hors zone France métropolitaine,
 * exclus du checkout — 01/12). Codes à 5 chiffres uniquement (France).
 */

function normalize(postalCode: string): string {
  return postalCode.trim().replace(/\s+/g, "");
}

export function isCorsicaPostalCode(postalCode: string): boolean {
  const code = normalize(postalCode);
  return /^20\d{3}$/.test(code);
}

/**
 * DOM (971-976) + COM/TOM (98x) : codes postaux métropolitains français mais
 * hors de la zone de livraison V1 (France métropolitaine uniquement — 01/12).
 * Distinct de la restriction Stripe `allowed_countries: ['FR']`, qui traite
 * déjà ces territoires comme des pays ISO séparés (GP, MQ, RE, YT, GF…) : ce
 * contrôle est une défense en profondeur pour un code postal saisi côté site.
 */
export function isExcludedOverseasPostalCode(postalCode: string): boolean {
  const code = normalize(postalCode);
  if (!/^\d{5}$/.test(code)) return false;

  const prefix3 = code.slice(0, 3);
  const prefix2 = code.slice(0, 2);

  return ["971", "972", "973", "974", "975", "976"].includes(prefix3) || prefix2 === "98";
}
