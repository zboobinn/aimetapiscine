"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { verifySiret } from "@/lib/insee/verify-siret";
import { validateSiret } from "@/lib/siret/validate";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface ProSignupState {
  error?: string;
  success?: boolean;
}

const formSchema = z.object({
  siret: z.string().trim().min(1, "SIRET requis."),
  companyName: z.string().trim().min(1, "Raison sociale requise."),
});

/**
 * Inscription pro (14) : validation de FORMAT (14 chiffres + Luhn) côté
 * serveur — jamais confiance dans une validation client seule (23). Toute
 * demande passant ce contrôle passe en PRO_PENDING ; la vérification INSEE
 * (si configurée, 26) n'est qu'indicative et n'accorde JAMAIS PRO_VERIFIED
 * elle-même — seul un contrôle manuel via Supabase Studio le fait.
 */
export async function submitProSignupAction(
  _prevState: ProSignupState,
  formData: FormData,
): Promise<ProSignupState> {
  const parsed = formSchema.safeParse({
    siret: formData.get("siret"),
    companyName: formData.get("companyName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const siretValidation = validateSiret(parsed.data.siret);
  if (!siretValidation.valid) {
    return { error: siretValidation.error ?? "SIRET invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous d'abord pour faire une demande de compte pro." };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "USER" | "PRO_PENDING" | "PRO_VERIFIED" }>();

  if (existingProfile?.role === "PRO_VERIFIED") {
    return { error: "Votre compte professionnel est déjà vérifié." };
  }

  // Isolé (26) : ne bloque jamais l'inscription, retourne "not_configured"
  // sans identifiants INSEE, "error" sur tout souci réseau/API.
  const inseeResult = await verifySiret(siretValidation.cleaned);

  // `role` est protégé par privilège SQL, pas seulement RLS (03/14) : la
  // mise à jour passe par service_role, restreinte ici à CE profil (id issu
  // de la session serveur, jamais du client).
  const serviceClient = createServiceRoleClient();
  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({
      siret: siretValidation.cleaned,
      company_name: parsed.data.companyName,
      role: "PRO_PENDING",
      insee_status: inseeResult.status,
      insee_verified_at: inseeResult.status === "verified" ? inseeResult.checkedAt : null,
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Impossible d'enregistrer votre demande pour le moment. Réessayez." };
  }

  revalidatePath("/compte/pro");
  return { success: true };
}
