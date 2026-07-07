import type { z } from "zod";

import {
  analyticsSchema,
  apfSchema,
  businessConfigSchema,
  companySchema,
  resendSchema,
  revalidateSchema,
  siteSchema,
  stripeSchema,
  supabasePublicSchema,
  supabaseServiceSchema,
} from "@/lib/env/schemas";

/**
 * Accès paresseux et contextuel aux variables d'environnement (26) :
 * chaque domaine n'est parsé QUE lorsqu'un appelant en a besoin, et
 * l'erreur ne porte que sur les variables de ce domaine. Un script qui
 * n'utilise que Supabase (ex. `scripts/import-catalog.ts`) ne valide donc
 * jamais les clés Stripe/Resend/société.
 *
 * `assertFullEnv()` (appelé une seule fois au démarrage de l'app Next.js,
 * voir `src/instrumentation.ts`) force la validation de TOUS les domaines
 * pour conserver l'échec strict au build/boot exigé par la spec 26.
 */

function domainAccessor<Schema extends z.ZodType>(domain: string, schema: Schema) {
  let cached: z.infer<Schema> | undefined;

  return (): z.infer<Schema> => {
    if (cached) return cached;

    const parsed = schema.safeParse(process.env);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Variables d'environnement invalides (${domain}) :\n${issues}`);
    }

    cached = parsed.data;
    return cached;
  };
}

export const getSiteEnv = domainAccessor("site", siteSchema);
export const getAnalyticsEnv = domainAccessor("analytics", analyticsSchema);
export const getSupabaseEnv = domainAccessor("supabase", supabasePublicSchema);
export const getSupabaseServiceEnv = domainAccessor("supabase-service", supabaseServiceSchema);
export const getStripeEnv = domainAccessor("stripe", stripeSchema);
export const getResendEnv = domainAccessor("resend", resendSchema);
export const getRevalidateEnv = domainAccessor("revalidate", revalidateSchema);
export const getApfEnv = domainAccessor("apf", apfSchema);
export const getBusinessConfigEnv = domainAccessor("business-config", businessConfigSchema);
export const getCompanyEnv = domainAccessor("company", companySchema);

/** Force la validation de tous les domaines — un seul appel au boot de l'app. */
export function assertFullEnv() {
  getSiteEnv();
  getAnalyticsEnv();
  getSupabaseEnv();
  getSupabaseServiceEnv();
  getStripeEnv();
  getResendEnv();
  getRevalidateEnv();
  getApfEnv();
  getBusinessConfigEnv();
  getCompanyEnv();
}
