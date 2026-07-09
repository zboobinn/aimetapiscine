import { NextResponse } from "next/server";

import { API_ERROR_STATUS, type ApiErrorCode } from "./errors";

/**
 * Forme unique des erreurs de Route Handler (15) : `{ error: { code, message } }`.
 * Le webhook Stripe (`/api/webhooks/stripe`) est explicitement EXEMPTÉ — Stripe
 * attend des statuts HTTP bruts, pas cette enveloppe.
 */
export function apiError(code: ApiErrorCode, message: string, init?: ResponseInit) {
  return NextResponse.json(
    { error: { code, message } },
    { ...init, status: API_ERROR_STATUS[code] },
  );
}

/** Succès : payload direct, jamais d'enveloppe `{ data }` (15). */
export function apiSuccess<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

/** À poser sur toute route lue en temps réel (panier, checkout, prix, documents — 15). */
export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
