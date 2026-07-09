/**
 * Codes d'erreur machine des Route Handlers (15). Un code = une situation
 * précise, documentée ici — jamais un message Stripe/Supabase/pdfkit/INSEE
 * brut (23).
 */
export const ApiErrorCode = {
  /** Corps ou paramètres de requête rejetés par Zod. */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** Aucune session valide. */
  UNAUTHENTICATED: "UNAUTHENTICATED",
  /** Session valide mais rôle insuffisant pour la ressource demandée. */
  FORBIDDEN: "FORBIDDEN",
  /** Ressource inexistante ou non accessible par l'appelant. */
  NOT_FOUND: "NOT_FOUND",
  /** Code postal hors zone de livraison V1 (DOM-TOM, 12). */
  SHIPPING_ZONE_EXCLUDED: "SHIPPING_ZONE_EXCLUDED",
  /** Une ou plusieurs lignes du panier ne sont plus disponibles au moment de payer. */
  ITEMS_UNAVAILABLE: "ITEMS_UNAVAILABLE",
  /** Échec serveur générique (jamais de détail interne exposé, 23). */
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SHIPPING_ZONE_EXCLUDED: 400,
  ITEMS_UNAVAILABLE: 409,
  INTERNAL_ERROR: 500,
};
