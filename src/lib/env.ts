import { z } from "zod";

const envSchema = z.object({
  // Publiques (préfixe NEXT_PUBLIC_ — exposées au navigateur : jamais de secret ici)
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_ANALYTICS_DOMAIN: z.string().min(1).optional(),

  // Secrets serveur
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  REVALIDATE_SECRET: z.string().min(1),
  APF_LOGISTICS_EMAIL: z.string().email(),
  ADMIN_ALERT_EMAIL: z.string().email(),

  // Configuration métier (modifiable sans toucher au code)
  PACK_DISCOUNT_BPS: z.coerce.number().int().min(0).max(10000).default(500),
  LOSS_COEFF_BASE: z.coerce.number().positive().default(1.15),
  LOSS_COEFF_STAIRS: z.coerce.number().positive().default(1.2),
  SHIPPING_MODE: z.enum(["included", "flat"]).default("included"),
  SHIPPING_FLAT_FEE_CENTS: z.coerce.number().int().min(0).default(4000),
  COMPANY_NAME: z.string().min(1),
  COMPANY_SIREN: z.string().min(1),
  COMPANY_VAT: z.string().min(1),
  COMPANY_ADDRESS: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
