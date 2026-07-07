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

### 2026-07-07 — Squelette de navigation et routes (07/06)
- **Décision** : layout global (`Header` sticky avec menu hamburger client-only `MobileNav`, `Footer`) posé dans `src/components/layout/`, réutilisé par `RootLayout`. Toutes les routes de 07 créées en coquilles : `/`, `/membrane-armee` (+ `[gamme]` + `[gamme]/[couleur]`), `/accessoires` (+ `[categorie]` + `[categorie]/[slug]`), `/calculateur`, `/simulateur-3d`, `/panier`, `/commande/confirmation`, `/compte` (+ `/compte/pro`), `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/guides` (+ `[slug]`), pages légales. Hub et fiches en ISR (`revalidate = 3600`) avec `generateStaticParams` branché sur les 8 produits de test de `data/catalog.json` (nouveaux helpers dans `src/lib/catalog/data.ts`) ; `notFound()` propre si gamme/couleur/catégorie/slug absent. `noindex` posé sur panier, confirmation, compte et pages auth. Fil d'Ariane (`src/components/breadcrumbs.tsx`) sur les pages profondes. `/guides` utilise une liste placeholder (`guides-data.ts`) en attendant l'intégration MDX de 20.
- **Motif** : poser la structure de navigation et le bon mode de rendu par page avant de brancher la logique métier (calculateur, panier, auth) ; catégories accessoires mappées vers des slugs FR lisibles (`feutres`, `colles`, `pvc-liquide`, `profils`, `solvants`) plutôt que les enums bruts du catalogue.
- **Impact** : 06, 07 ; `src/app/**`, `src/components/layout/*`, `src/components/breadcrumbs.tsx`, `src/lib/catalog/data.ts`, `src/lib/utils/text.ts`.

### 2026-07-07 — Correctif : fuite de la mention APF côté client
- **Décision** : retrait de toute mention « APF »/« APF Pool Design » visible côté client — accroche d'accueil, `<title>`/description globaux, texte du simulateur 3D. Sur les fiches produit, le champ « Référence » affiche désormais `produit.slug` (identifiant client, stable) au lieu de `produit.sku` (préfixé `APF-...`, interne fournisseur).
- **Motif** : violation directe de la règle blind shipping (01) — « ne jamais afficher ni logger de référence APF dans un livrable destiné au client » — repérée après revue du squelette de navigation. Le `sku` reste utilisé côté code (clé React, imports catalogue, `service_role`) car jamais rendu au DOM ; seul l'affichage client était concerné.
- **Impact** : 01, 04, 07 ; `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/simulateur-3d/page.tsx`, `src/app/membrane-armee/[gamme]/[couleur]/page.tsx`, `src/app/accessoires/[categorie]/[slug]/page.tsx`.

### 2026-07-07 — Calculateur expert : logique pure isolée + convention `coverage`
- **Décision** : toute la logique de calcul vit dans `src/features/calculator/` en fonctions pures sans accès réseau ni dépendance UI (`geometry.ts`, `rolls.ts`, `accessories.ts`, `calculate-pack.ts`), orchestrées par `calculatePack()`. Les paramètres ajustables (coefficients de perte, surfaces forfaitaires par escalier, mapping catégorie → grandeur de besoin) sont centralisés dans `calculator-config.ts` ; les coefficients de perte restent surchargeables par env (`LOSS_COEFF_BASE`/`LOSS_COEFF_STAIRS`, 26) mais la lecture de `process.env` se fait UNIQUEMENT côté Server Component (`src/app/calculateur/page.tsx` via `getBusinessConfigEnv()`), jamais dans `features/calculator/`. Convention `coverage` (04) uniformisée : une seule clé par accessoire représentant le rendement d'une unité vendable (`m2_per_unit` pour feutre/colle, `ml_per_unit`/`ml_per_barre` pour PVC liquide/profils/solvant) — l'entrée `COLLE` de `data/catalog.json` a été convertie de `kg_per_m2` (taux d'application) vers `m2_per_unit` (rendement du bidon) pour rester cohérente ; la grandeur de besoin (surface brute vs périmètre) par catégorie est fixée dans `calculator-config.ts`, jamais dans les fonctions de calcul. Formes extensibles via union discriminée `PoolInput` (V1 : rectangle uniquement). Parcours UI en 4 écrans (`src/app/calculateur/calculator-wizard.tsx`, Client Component) : forme, dimensions, escalier, résultat ; état sérialisé dans l'URL (`url-state.ts`, zod) pour un lien partageable qui relance directement à l'étape résultat. Interface d'ajout panier préparée (`cart-draft.ts`, `buildCartDraft()`) sans store/API réels (09 à venir). Tests unitaires Vitest ajoutés (`vitest.config.ts` racine, alias `@` → `src`) : cas nominaux, bornes min/max, arrondis, coefficient avec/sans escalier, aller-retour URL.
- **Motif** : les rendements APF réels ne sont pas encore connus (24, priorité aux tests pour sécuriser les futurs remplacements de coefficients) ; séparer strictement logique pure et UI permet au serveur de rejouer la même logique au checkout (10) sans duplication. La clé `coverage` du schéma (04) est un `record` libre : uniformiser son nommage ne casse pas le schéma Zod et simplifie le calcul générique par catégorie plutôt que du code spécifique par SKU.
- **⚠️ À refaire à réception des fiches techniques APF** : la conversion `COLLE` (`kg_per_m2: 0.3` → `m2_per_unit: 16.6`) est une simple division arithmétique (5 kg / 0,3 kg/m²) qui SUPPOSE un bidon de 5 kg net — ce contenu n'est pas un champ du catalogue (seul `weight_grams`, poids d'expédition, existe) et n'est donc pas garanti exact même pour la donnée de test actuelle. Dès réception des vraies fiches techniques APF, il faudra : (1) confirmer le contenu net réel de chaque conditionnement (colle, PVC liquide, solvant), (2) recalculer `m2_per_unit`/`ml_per_unit`/`ml_per_barre` à partir des taux d'application réels APF, (3) vérifier si tous les accessoires suivent bien un modèle "rendement par unité vendable" ou si certains nécessitent un mapping catégorie→grandeur différent dans `calculator-config.ts` (`ACCESSORY_YIELD_RULES`).
- **Impact** : 08, 24, 26 ; `src/features/calculator/*`, `src/app/calculateur/*`, `data/catalog.json` (COLLE), `vitest.config.ts`, `package.json` (script `test` déjà présent).

### EN ATTENTE — Frais de port : option A (inclus, « livraison offerte ») vs option B (forfait ~40 €)
- **Décision** : non tranchée. Implémentation derrière `getShippingFee()` + env `SHIPPING_MODE` pour basculer sans refonte.
- **Impact** : 09, 10, 12, 26.

### EN ATTENTE — Corse : incluse ou exclue de la zone de livraison
- **Décision** : à valider avec APF (surcoût transporteur probable sur rouleaux longs).
- **Impact** : 12, 22.

### 2026-07-07 — Panier : store Zustand sans prix + résolution serveur via `/api/cart/resolve`
- **Décision** : panier client (`src/features/cart/`, store Zustand persisté en `localStorage`) qui ne stocke QUE `{sku, quantity, source: 'catalog'|'pack', packId?}` — jamais de montant. `/panier` (`panier-client.tsx`) envoie ces lignes à la Route Handler `POST /api/cart/resolve`, qui lit le catalogue (`lib/catalog/data.ts`, même source que le reste du site) et renvoie nom, image, disponibilité et prix unitaire déjà résolus. Le rôle tarifaire est déterminé par `resolvePricingRole()` (`src/lib/pricing/resolve-role.ts`), aujourd'hui toujours `"b2c"` (aucun compte pro vérifié ne peut encore exister) : c'est le SEUL point à modifier pour brancher la lecture de `profiles.role` en DB (14) sans retoucher au reste du panier. Ajout au panier depuis le calculateur (`buildCartDraft` → `addPackLines()`, un `packId` par ajout + la query string du calculateur mémorisée pour le lien « Recalculer ») et depuis les fiches produit (`AddToCartButton`, avec cross-sell des accessoires dont la catégorie a un rendement dans `calculator-config.ts` — même logique que 08, suggestion jamais forcée).
- **Motif** : respecter la règle 09/23 « le client affiche, le serveur décide » sans complexifier prématurément le panier avec la logique de rôle complète de 14, qui n'existe pas encore. Réutiliser le catalogue JSON (comme toutes les pages produit) plutôt que d'interroger Supabase directement depuis cette route évite une divergence de source de vérité tant que 14 n'est pas là.
- **Impact** : 09, 13 (remise pack à brancher plus tard sur `resolveUnitPriceCents`), 14 (`resolvePricingRole`) ; `src/features/cart/*`, `src/lib/pricing/*`, `src/app/api/cart/resolve/route.ts`, `src/app/panier/*`, `src/components/cart/add-to-cart-button.tsx`, `src/app/calculateur/calculator-wizard.tsx`.

### 2026-07-07 — Quantités du panier : boutons +/− dédiés plutôt que le composant `Stepper`
- **Décision** : les quantités éditables du panier utilisent un petit contrôle +/− local à `panier-client.tsx`, pas le composant `Stepper` de 05/`components/ui/stepper.tsx`.
- **Motif** : ce `Stepper` est l'indicateur d'étapes du calculateur (cercles numérotés + labels) — sémantiquement un « stepper de progression », pas un incrément/décrément de quantité. Le réutiliser pour éditer une quantité aurait été un détournement visuel trompeur (numéros d'étape affichés à la place d'une quantité). Un contrôle dédié réutilisant `Button` (`variant="secondary"`, `size="sm"`) reste cohérent avec le design system sans forcer un composant hors de son usage prévu.
- **Impact** : 05, 09 ; `src/app/panier/panier-client.tsx`.
