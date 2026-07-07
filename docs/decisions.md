# Journal des décisions techniques

Mémoire des choix structurants du projet. À tenir à jour à CHAQUE décision prise, modifiée ou annulée.

## Format
### AAAA-MM-JJ — Titre court
- **Décision** : ce qui est décidé.
- **Motif** : pourquoi (contraintes, alternatives écartées).
- **Impact** : specs/fichiers concernés.

---

### 2026-07-07 — Back-end intégré à Next.js (pas de serveur séparé)
- **Décision** : Route Handlers Next.js sur Vercel ; pas d'Express/NestJS ni de Railway/Render en V1. Mono-repo.
- **Motif** : besoins serveur limités (webhook, PDF, emails), un seul déploiement, coût nul, équipe d'une personne. Extraction possible plus tard (flux APF automatisé, crons).
- **Impact** : 15-api, 25-deploiement.

### 2026-07-07 — Supabase (PostgreSQL + Auth + Storage)
- **Décision** : Supabase retenu contre Neon/Railway ; Supabase Auth (pas d'auth custom) ; Storage à la place de S3 ; Studio = back-office V1.
- **Motif** : Auth + RLS + Storage intégrés, région UE, gain de temps majeur pour un dev solo.
- **Impact** : 03, 14, 16, 23.

### 2026-07-07 — Génération PDF : pdfkit (pas Puppeteer)
- **Décision** : BL et factures générés avec pdfkit.
- **Motif** : Puppeteer trop lourd pour les fonctions serverless Vercel.
- **Impact** : 11, 15.

### 2026-07-07 — Emails : Resend + react-email
- **Décision** : Resend pour tout le transactionnel.
- **Motif** : simplicité, coût, DX ; volume V1 faible.
- **Impact** : 17.

### 2026-07-07 — Flux Git : GitLab (source) → mirror GitHub → Vercel
- **Décision** : push sur GitLab uniquement ; GitHub en miroir ; Vercel branché sur GitHub.
- **Motif** : flux souhaité par le porteur de projet ; conséquences (délai de mirroring, interdiction de push GitHub) documentées en 25.
- **Impact** : 02, 25.

### 2026-07-07 — SEO : pas d'AggregateRating en V1
- **Décision** : JSON-LD Product/Offer sans avis ; AggregateRating réactivé uniquement avec de vrais avis clients (post-V1).
- **Motif** : baliser des notes inexistantes viole les guidelines Google (risque d'action manuelle).
- **Impact** : 18.

### 2026-07-07 — Analytics cookieless dès la V1, pas de GA4
- **Décision** : Plausible (ou Umami) sans cookies ; gestionnaire de consentement dormant, prêt pour la pub future.
- **Motif** : mesure dès le jour 1 sans bannière obligatoire ; pub prévue mais pas au lancement.
- **Impact** : 21, 22.

### 2026-07-07 — Projet Supabase cloud (région UE) provisionné, migration initiale appliquée
- **Décision** : projet Supabase créé en région UE ; clés `anon` et `service_role` retenues (récupérées dans Supabase Studio, renseignées dans `.env.local`, jamais commitées). Migration `20260707000000_init_schema.sql` (enums, tables `profiles`/`products`/`orders`/`order_items`, index, séquence facture, trigger `on_auth_user_created`, policies RLS) appliquée avec succès sur le projet cloud ; tables visibles dans Studio avec RLS activée.
- **Motif** : région UE pour la conformité RGPD (22) ; `service_role` indispensable aux webhooks/scripts serveur qui doivent contourner RLS (23), `anon` pour les clients navigateur/session.
- **Impact** : 03, 14, 23, 26.

### 2026-07-07 — Import catalogue produits + validation d'environnement contextuelle
- **Décision** : fichier pivot `data/catalog.json` (schéma Zod `src/lib/catalog/schema.ts`) importé de façon idempotente vers `public.products` via `scripts/import-catalog.ts` (`pnpm catalog:import`, upsert par `sku`, désactivation des SKU absents). Rempli avec 8 produits de TEST (tarifs/poids fictifs) — à remplacer par les vrais tarifs APF dès réception. En parallèle, `lib/env.ts` unique a été éclaté en `lib/env/` : schémas Zod regroupés par domaine (supabase public, supabase service_role, stripe, resend, revalidate, apf, business config, company) avec accesseurs paresseux (`getSupabaseServiceEnv()`, etc.) qui ne valident que les variables réellement utilisées par l'appelant ; `src/instrumentation.ts` appelle `assertFullEnv()` une fois au boot Next.js pour conserver l'échec strict exigé par 26 côté app.
- **Motif** : le script d'import tourne hors runtime Next.js et ne doit dépendre ni de `server-only` (import direct de `@/lib/supabase/service-role` impossible hors build Next.js) ni de secrets Stripe/Resend/société qu'il n'utilise pas ; la validation globale d'un seul bloc bloquait `pnpm catalog:import` en environnement partiellement configuré.
- **Impact** : 04, 26 ; `data/catalog.json`, `scripts/import-catalog.ts`, `src/lib/catalog/schema.ts`, `src/lib/env/`, `src/instrumentation.ts`, `src/lib/supabase/*`.

### EN ATTENTE — Frais de port : option A (inclus, « livraison offerte ») vs option B (forfait ~40 €)
- **Décision** : non tranchée. Implémentation derrière `getShippingFee()` + env `SHIPPING_MODE` pour basculer sans refonte.
- **Impact** : 09, 10, 12, 26.

### EN ATTENTE — Corse : incluse ou exclue de la zone de livraison
- **Décision** : à valider avec APF (surcoût transporteur probable sur rouleaux longs).
- **Impact** : 12, 22.
