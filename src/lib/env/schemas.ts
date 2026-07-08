import { z } from "zod";

/**
 * Schémas regroupés par domaine (26). Chaque domaine ne couvre que les
 * variables dont ce domaine a besoin : un script ou un module qui
 * n'utilise que Supabase ne doit jamais être bloqué par l'absence d'une
 * clé Stripe/Resend qu'il n'utilise pas.
 */

export const siteSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const analyticsSchema = z.object({
  NEXT_PUBLIC_ANALYTICS_DOMAIN: z.string().min(1).optional(),
});

// Client public (anon key) — Server/Client Components (23 : jamais la clé service_role ici).
export const supabasePublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Client service_role — webhooks et scripts serveur uniquement (23).
export const supabaseServiceSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

// Séparé du secret webhook (ci-dessous) : la création de session (10) ne
// dépend que de la clé secrète, jamais du secret de signature webhook — qui
// n'existe qu'une fois `stripe listen` lancé en dev (02).
export const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
});

export const stripeWebhookSchema = z.object({
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export const resendSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
});

export const revalidateSchema = z.object({
  REVALIDATE_SECRET: z.string().min(1),
});

export const apfSchema = z.object({
  APF_LOGISTICS_EMAIL: z.string().email(),
  ADMIN_ALERT_EMAIL: z.string().email(),
});

export const businessConfigSchema = z.object({
  PACK_DISCOUNT_BPS: z.coerce.number().int().min(0).max(10000).default(500),
  LOSS_COEFF_BASE: z.coerce.number().positive().default(1.15),
  LOSS_COEFF_STAIRS: z.coerce.number().positive().default(1.2),
  SHIPPING_MODE: z.enum(["included", "flat"]).default("included"),
  SHIPPING_FLAT_FEE_CENTS: z.coerce.number().int().min(0).default(4000),
  // Provisoire — surcoût transporteur Corse, à confirmer avec APF (12, decisions.md).
  SHIPPING_CORSICA_SURCHARGE_CENTS: z.coerce.number().int().min(0).default(3000),
});

export const companySchema = z.object({
  COMPANY_NAME: z.string().min(1),
  COMPANY_SIREN: z.string().min(1),
  COMPANY_VAT: z.string().min(1),
  COMPANY_ADDRESS: z.string().min(1),
});
