"use server";

import { z } from "zod";

import { getSiteEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface ResetRequestState {
  submitted?: boolean;
  error?: string;
}

const emailSchema = z.string().trim().email("Adresse e-mail invalide.");

/**
 * Toujours répondre par le même message de succès, que l'adresse existe ou
 * non (23) : éviter qu'un formulaire de reset serve à énumérer les comptes.
 */
export async function requestPasswordResetAction(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide." };
  }

  const supabase = await createClient();
  const siteUrl = getSiteEnv().NEXT_PUBLIC_SITE_URL;

  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/mettre-a-jour-mot-de-passe`,
  });

  return { submitted: true };
}
