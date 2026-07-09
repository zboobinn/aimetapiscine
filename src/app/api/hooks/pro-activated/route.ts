import crypto from "node:crypto";

import { z } from "zod";

import { ApiErrorCode } from "@/lib/api/errors";
import { apiError, apiSuccess, NO_STORE_HEADERS } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validate";
import { getEmailEnv } from "@/lib/env";
import { sendProActivatedEmail } from "@/lib/email/notifications";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Appelée par un Database Webhook Supabase (à configurer après déploiement,
 * voir decisions.md) sur `update` de `profiles.role` — jamais par le client.
 * Ne modifie JAMAIS `role` : l'activation reste 100 % manuelle dans Studio
 * (14/17). Cette route se contente d'envoyer l'email une fois le rôle
 * PRO_VERIFIED confirmé EN BASE (jamais confiance dans le body).
 */

const bodySchema = z.object({ userId: z.string().uuid() });

const HEADER_NAME = "x-pro-activation-secret";

function isSecretValid(request: Request): boolean {
  const expected = getEmailEnv().PRO_ACTIVATION_HOOK_SECRET;
  const provided = request.headers.get(HEADER_NAME);

  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  if (!isSecretValid(request)) {
    return apiError(ApiErrorCode.UNAUTHENTICATED, "Secret invalide.");
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if ("response" in parsed) return parsed.response;

  const supabase = createServiceRoleClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role, pro_activation_email_sent_at")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (error || !profile) {
    return apiError(ApiErrorCode.NOT_FOUND, "Profil introuvable.");
  }

  if (profile.role !== "PRO_VERIFIED") {
    return apiError(ApiErrorCode.FORBIDDEN, "Ce profil n'est pas (encore) PRO_VERIFIED.");
  }

  if (profile.pro_activation_email_sent_at) {
    return apiSuccess({ sent: false }, { headers: NO_STORE_HEADERS });
  }

  try {
    await sendProActivatedEmail(profile.email);
  } catch (sendError) {
    console.error(`[pro-activated] Envoi email échoué pour ${profile.id}`, sendError);
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Envoi de l'email échoué.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ pro_activation_email_sent_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (updateError) {
    console.error(
      `[pro-activated] Écriture pro_activation_email_sent_at échouée pour ${profile.id}`,
      updateError,
    );
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Statut d'envoi non enregistré.");
  }

  return apiSuccess({ sent: true }, { headers: NO_STORE_HEADERS });
}
