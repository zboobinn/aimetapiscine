/**
 * Preuve — bassins réalisés (30 §06) — HORS PÉRIMÈTRE de cette passe,
 * volontairement (spec 31 : vrais avis clients + modération a priori D9,
 * vraies photos client consenties, annexe-brief-photo — aucun des deux
 * n'existe). Emplacement réservé, intentionnellement VIDE : ne pas remplir
 * avec des avis ou des chiffres fictifs.
 */
export function SocialProofPlaceholder() {
  return <section aria-label="Avis clients" data-placeholder="social-proof-31" />;
}
