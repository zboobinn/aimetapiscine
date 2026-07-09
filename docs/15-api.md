# 15 — API interne (Route Handlers Next.js)

Objectif : back-end intégré minimal, typé, validé — pas de serveur séparé en V1.

## Endpoints V1
- `POST /api/cart/resolve` : body `{lines, packs, postalCode?}` → Zod → résolution serveur des prix/rôle/remise pack/estimation port pour affichage panier.
- `POST /api/checkout` : body `{lines, packs, postalCode?}` → Zod → recalcul serveur (stock, prix rôle, -5 %, port) → création Checkout Session → `{url}`.
- `GET /api/pricing/product-price?sku=...` : hydratation client du prix pro sur les fiches/grilles produit (pages ISR, 07/14) — jamais mis en cache.
- `GET /api/compte/commandes/[orderId]/facture` : redirige vers une URL signée Supabase Storage après vérification de propriété (RLS).
- `POST /api/webhooks/stripe` : réception des événements (10). Body BRUT requis pour la signature — lire `await req.text()` AVANT tout parsing. EXEMPTÉ de la convention d'erreur (voir Conventions).
- `GET /auth/callback` : échange du code PKCE (confirmation email / reset mot de passe, 14) — redirections navigateur uniquement, hors périmètre JSON.
- Inscription/vérification pro (SIRET) : **Server Action** (`src/app/compte/pro/actions.ts`, `submitProSignupAction`), pas une Route Handler — formulaire même origine (règle Server Action vs Route Handler ci-dessous). Pas de `/api/pro/register`.
- Pas d'API publique catalogue : les pages lisent la DB directement en RSC (moins de surface, moins de latence).

## Conventions
Détaillées et tenues à jour dans la section « Conventions API » de `CLAUDE.md` (source unique, à ne pas dupliquer ici) :
- Forme des erreurs `{error:{code,message}}`, succès en payload direct.
- Codes HTTP fixes par situation (400/401/403/404/409/500).
- Validation Zod systématique (`src/lib/api/validate.ts`).
- Cache `no-store`/`dynamic force-dynamic` sur les routes temps réel.
- Runtime `nodejs` explicite si pdfkit/Stripe/`service_role`.
- Règle Server Action vs Route Handler.
- Rôle tarifaire toujours résolu serveur (`resolvePricingRole()`).
- Exemption du webhook Stripe.

## Pièges
- Timeout des fonctions Vercel : la chaîne webhook → PDF → 2 emails doit tenir dans la limite du plan ; mesurer (24) et si besoin découper (créer la commande, répondre 200, finir la génération/envoi en tâche différée type `waitUntil`).
- Rate limiting simple (par IP) sur `/api/checkout` et l'inscription pro — pas encore implémenté (23).
- Ne jamais renvoyer de détail interne dans les erreurs (stack, SQL) ni de SKU/référence fournisseur (blind shipping, 01).

## Reste à faire
- `/api/revalidate` (revalidation ISR post-import catalogue, protégée par `REVALIDATE_SECRET`) : mentionnée dans une version antérieure de cette spec, **non implémentée** — dette identifiée, hors périmètre du chantier de mise en conformité du 2026-07-09 (voir `docs/decisions.md`).
