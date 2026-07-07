# 26 — Variables d'environnement et configuration

Objectif : configuration exhaustive et sûre, documentée dans `.env.example` (commité, sans valeurs).

## Variables
### Publiques (préfixe NEXT_PUBLIC_ — exposées au navigateur : JAMAIS de secret ici)
- `NEXT_PUBLIC_SITE_URL` — URL canonique (SEO, emails, redirections Stripe)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ANALYTICS_DOMAIN` (21)

### Secrets serveur
- `SUPABASE_SERVICE_ROLE_KEY` — webhooks/scripts uniquement (23)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — test en dev/preview, live en prod SEULEMENT
- `RESEND_API_KEY`
- `REVALIDATE_SECRET` — protège `/api/revalidate` (15)
- `APF_LOGISTICS_EMAIL` — destinataire des ordres d'expédition (17)
- `ADMIN_ALERT_EMAIL` — alertes (échec email APF — 17)

### Configuration métier (modifiable sans toucher au code)
- `PACK_DISCOUNT_BPS` (défaut 500 — 13), `LOSS_COEFF_BASE` (1.15), `LOSS_COEFF_STAIRS` (1.20 — 08)
- `SHIPPING_MODE` (`included` | `flat`), `SHIPPING_FLAT_FEE_CENTS` (4000 — 12)
- `COMPANY_NAME`, `COMPANY_SIREN`, `COMPANY_VAT`, `COMPANY_ADDRESS` — gabarits facture/mentions légales (11, 22), à remplir à l'immatriculation

## Règles
- `.env.local` en dev (gitignoré) ; prod/preview : variables Vercel par environnement.
- Validation au démarrage : `lib/env.ts` parse `process.env` avec Zod et ÉCHOUE au build si une variable manque. Aucun accès direct à `process.env` ailleurs dans le code.
- Toute clé exposée par erreur est révoquée immédiatement (rotation en un clic chez Stripe/Supabase/Resend).

## Pièges
- Une variable ajoutée/modifiée dans Vercel n'est prise en compte qu'au prochain déploiement.
- Ne JAMAIS préfixer `SUPABASE_SERVICE_ROLE_KEY` par `NEXT_PUBLIC_` (fuite totale de la base).
