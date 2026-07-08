"use server";

import { z } from "zod";

import { getSiteEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface SignUpState {
  error?: string;
  success?: boolean;
}

const signUpSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});

/**
 * Inscription B2C (14) : confirmation d'email obligatoire avant connexion.
 * `emailRedirectTo` cible /auth/callback (échange du code PKCE) : fonctionne
 * avec le gabarit Supabase Auth PAR DÉFAUT, sans personnalisation (verrouillée
 * tant que le SMTP custom Resend n'est pas en place, 17).
 */
export async function signUpAction(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const siteUrl = getSiteEnv().NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/compte`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Un compte existe déjà avec cette adresse e-mail." };
    }
    return { error: "Inscription impossible pour le moment. Réessayez." };
  }

  return { success: true };
}
