import "server-only";

import { Resend } from "resend";

import { getEmailEnv } from "@/lib/env";

/**
 * Client Resend paresseux, sur le modèle de `lib/insee/verify-siret.ts` :
 * `null` si `RESEND_API_KEY` n'est pas configurée, jamais une exception —
 * `sendEmail()` (17) traite ce cas comme un no-op loggé.
 */
let cachedClient: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;

  const apiKey = getEmailEnv().RESEND_API_KEY;
  cachedClient = apiKey ? new Resend(apiKey) : null;
  return cachedClient;
}
