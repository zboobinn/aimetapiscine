import "server-only";

import { getInseeEnv } from "@/lib/env";

export type InseeVerificationStatus = "not_configured" | "verified" | "not_found" | "inactive" | "error";

export interface InseeVerificationResult {
  status: InseeVerificationStatus;
  checkedAt: string;
}

const SIRENE_SIRET_ENDPOINT = "https://api.insee.fr/api-sirene/3.11/siret";

/**
 * Vérifie un SIRET auprès de l'API Sirene (INSEE) : existe-t-il, l'établissement
 * est-il actif ? Isolé du reste du parcours pro (14) : cet appel ne DOIT JAMAIS
 * bloquer l'inscription. Si `INSEE_SIRENE_API_KEY` n'est pas configurée (26),
 * on retourne directement "not_configured" sans tenter d'appel réseau ; toute
 * erreur réseau/API est capturée et retournée comme "error", jamais relancée.
 * Le résultat n'est qu'indicatif : seul le contrôle manuel (Supabase Studio)
 * fait passer un profil en PRO_VERIFIED.
 */
export async function verifySiret(siret: string): Promise<InseeVerificationResult> {
  const checkedAt = new Date().toISOString();
  const apiKey = getInseeEnv().INSEE_SIRENE_API_KEY;

  if (!apiKey) {
    return { status: "not_configured", checkedAt };
  }

  try {
    const response = await fetch(`${SIRENE_SIRET_ENDPOINT}/${siret}`, {
      headers: { "X-INSEE-Api-Key-Integration": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 404) {
      return { status: "not_found", checkedAt };
    }

    if (!response.ok) {
      return { status: "error", checkedAt };
    }

    const body = (await response.json()) as {
      etablissement?: { periodesEtablissement?: Array<{ etatAdministratifEtablissement?: string }> };
    };
    const currentPeriod = body.etablissement?.periodesEtablissement?.[0];
    const isActive = currentPeriod?.etatAdministratifEtablissement === "A";

    return { status: isActive ? "verified" : "inactive", checkedAt };
  } catch {
    return { status: "error", checkedAt };
  }
}
