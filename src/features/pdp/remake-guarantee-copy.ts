/**
 * Copie de réassurance « garantie de reprise sur erreur de cote » (29 §8, A1)
 * — décision commerciale toujours en attente auprès d'APF, câblée derrière
 * `NEXT_PUBLIC_REMAKE_GUARANTEE` (`off` par défaut). Fonction pure : prend la
 * valeur BRUTE de la variable (déjà lue par l'appelant), jamais elle-même
 * `process.env` — testable sans manipuler l'environnement. Toute valeur
 * absente ou inconnue replie sur `off`, jamais une erreur ni un texte vide.
 */
export function getRemakeGuaranteeCopy(rawValue: string | undefined): string {
  switch (rawValue) {
    case "material-only":
      return "Erreur de cote ? On refait, vous payez la matière.";
    case "full":
      return "Erreur de cote ? On refait.";
    default:
      return "Découpe sur mesure — non repris.";
  }
}
