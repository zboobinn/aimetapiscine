# 15 — API interne (Route Handlers Next.js)

Objectif : back-end intégré minimal, typé, validé — pas de serveur séparé en V1.

## Endpoints V1
- `POST /api/checkout` : body `{items: {sku, quantity, source, packId?}[]}` → Zod → recalcul serveur (stock, prix rôle, -5 %, port) → création Checkout Session → `{url}`.
- `POST /api/webhooks/stripe` : réception des événements (10). Body BRUT requis pour la signature — lire `await req.text()` AVANT tout parsing.
- `POST /api/pro/register` : dépôt SIRET/raison sociale → `PRO_PENDING` (14).
- `POST /api/revalidate` : revalidation ISR après import catalogue (protégé par `REVALIDATE_SECRET`, 04/07/26).
- Pas d'API publique catalogue : les pages lisent la DB directement en RSC (moins de surface, moins de latence).

## Conventions
- Validation Zod systématique en entrée ; réponses `{data}` ou `{error: {code, message}}` ; statuts HTTP corrects (400/401/403/409/500).
- Trois clients Supabase distincts dans `lib/` : navigateur (anon), serveur-session (cookies), service_role (webhooks/scripts UNIQUEMENT — jamais importé dans du code client).
- Runtime Node (pas Edge) pour les handlers utilisant pdfkit/SDK Stripe ; `export const dynamic = 'force-dynamic'` sur le webhook.
- Logs structurés (JSON, sans PII) sur checkout et webhook.

## Pièges
- Timeout des fonctions Vercel : la chaîne webhook → PDF → 2 emails doit tenir dans la limite du plan ; mesurer (24) et si besoin découper (créer la commande, répondre 200, finir la génération/envoi en tâche différée type `waitUntil`).
- Rate limiting simple (par IP) sur `/api/checkout` et `/api/pro/register` (23).
- Ne jamais renvoyer de détail interne dans les erreurs (stack, SQL).
