"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface UpdatePasswordState {
  error?: string;
}

const passwordSchema = z.object({
  password: z.string().min(8, "8 caractères minimum."),
});

/**
 * Accessible uniquement avec la session temporaire posée par `verifyOtp`
 * (type `recovery`) sur /auth/confirm — pas de session valide, pas de mise à
 * jour possible (23).
 */
export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Lien expiré. Redemandez un e-mail de réinitialisation." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "Mise à jour impossible pour le moment. Réessayez." };
  }

  redirect("/compte");
}
