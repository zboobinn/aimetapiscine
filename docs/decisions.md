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

### 2026-07-07 — Design system : tokens via `@theme` CSS (Tailwind v4), pas de `tailwind.config`
- **Décision** : le projet utilise Tailwind v4 (`@tailwindcss/postcss`) qui pilote les tokens directement en CSS. Tokens couleurs/rayons/ombre définis dans `src/app/globals.css` (`@theme`) : `background`/`surface` (blanc/off-white), `ink`/`ink-muted`, `border`, `accent`/`accent-hover`/`accent-surface` (bleu piscine `#0E4D64`, accent unique), plus `danger`/`success` fonctionnels (erreurs de formulaire, statut de stock — pas des accents concurrents pour les CTA). Polices Manrope (titres, 500/600) + Inter (texte) chargées via `next/font/google` dans `layout.tsx`, exposées comme `--font-heading`/`--font-body`. Composants de base créés dans `src/components/ui/` (`Button`, `Input`, `ProductCard`, `Badge`, `Stepper`, `Price`) ; pas de `clsx`/`cva` ajoutés, un utilitaire `cn()` maison suffit (`src/lib/utils/cn.ts`). `next.config.ts` : `images.dangerouslyAllowSVG` activé (placeholders SVG de la démo ; à retirer/adapter quand les vraies photos produit APF arrivent).
- **Motif** : suivre l'outillage déjà en place (pas de fichier `tailwind.config.*` généré par `create-next-app` v4) plutôt que d'en réintroduire un ; respecter la contrainte « un seul accent » et interdire les valeurs de couleur arbitraires hors tokens (05).
- **Impact** : 05, 06 ; `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/*`, `src/app/design-system/page.tsx` (page de démo temporaire, à retirer avant prod), `next.config.ts`.

### 2026-07-07 — Validation d'environnement au boot réduite au socle (`assertCoreEnv`)
- **Décision** : `assertFullEnv()` (appelé par `src/instrumentation.ts`) remplacé par `assertCoreEnv()`, qui ne valide au démarrage que `site` + `supabase` (public + service_role). Les autres domaines (`analytics`, `stripe`, `resend`, `revalidate`, `apf`, `business-config`, `company`) restent des accesseurs paresseux (`getStripeEnv()`, etc., inchangés dans `src/lib/env/index.ts`) qui ne valident et n'échouent qu'au premier appel du code qui les consomme réellement.
- **Motif** : `assertFullEnv()` bloquait `pnpm dev` dès la phase design system faute de variables de specs pas encore développées (Stripe 10, Resend 17, analytics 21, société 11/22). Le principe « échec explicite si variable requise manquante » (26) reste respecté, mais appliqué au bon moment : au boot pour le socle dont dépend toute l'app, au runtime pour le reste.
- **Impact** : 26 ; `src/lib/env/index.ts`, `src/instrumentation.ts`, `.env.example` (sections « requises maintenant » vs « à venir »).

### EN ATTENTE — Frais de port : option A (inclus, « livraison offerte ») vs option B (forfait ~40 €)
- **Décision** : non tranchée. Implémentation derrière `getShippingFee()` + env `SHIPPING_MODE` pour basculer sans refonte.
- **Impact** : 09, 10, 12, 26.

### EN ATTENTE — Corse : incluse ou exclue de la zone de livraison
- **Décision** : à valider avec APF (surcoût transporteur probable sur rouleaux longs).
- **Impact** : 12, 22.
