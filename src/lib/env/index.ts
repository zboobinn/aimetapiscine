import type { z } from "zod";

import {
  analyticsSchema,
  apfSchema,
  businessConfigSchema,
  companySchema,
  emailSchema,
  inseeSchema,
  revalidateSchema,
  securitySchema,
  siteSchema,
  stripeSchema,
  stripeWebhookSchema,
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
 * `assertCoreEnv()` (appelé une seule fois au démarrage de l'app Next.js,
 * voir `src/instrumentation.ts`) ne force que les domaines dont le socle
 * applicatif dépend réellement dès le boot (site + Supabase). Les domaines
 * liés à des specs pas encore développées (analytics 21, Stripe 10, Resend
 * 17, société 11/22, revalidation, APF) restent purement lazy : ils
 * échouent au premier appel du code qui les utilise vraiment, pas avant.
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
export const getStripeWebhookEnv = domainAccessor("stripe-webhook", stripeWebhookSchema);
export const getEmailEnv = domainAccessor("email", emailSchema);
export const getRevalidateEnv = domainAccessor("revalidate", revalidateSchema);
export const getSecurityEnv = domainAccessor("security", securitySchema);
export const getApfEnv = domainAccessor("apf", apfSchema);
export const getBusinessConfigEnv = domainAccessor("business-config", businessConfigSchema);
export const getCompanyEnv = domainAccessor("company", companySchema);
export const getInseeEnv = domainAccessor("insee", inseeSchema);

/**
 * Force la validation des seuls domaines dont le socle applicatif dépend
 * dès le boot — un seul appel au démarrage de l'app (`src/instrumentation.ts`).
 * Les domaines de specs pas encore développées ne sont volontairement PAS
 * inclus ici : les ajouter reviendrait à bloquer `pnpm dev` avant que la
 * fonctionnalité correspondante n'existe.
 */
export function assertCoreEnv() {
  getSiteEnv();
  getSupabaseEnv();
  getSupabaseServiceEnv();
}
