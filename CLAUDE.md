# Membranes Armées — E-commerce B2C/B2B (dropshipping APF)

Vente en ligne de membranes armées piscine et accessoires de pose, en dropshipping exclusif avec APF Pool Design (blind shipping). Cibles : particuliers (prix TTC) et pros vérifiés (prix HT remisés). France métropolitaine uniquement. Module phare : calculateur expert générant des « Packs Prêts à Poser ».

## Stack
- Next.js (App Router) + TypeScript strict + Tailwind CSS — mono-repo, back intégré (Route Handlers, pas de serveur séparé)
- Supabase : PostgreSQL + Auth + Storage (région UE), RLS activée partout
- Stripe (Checkout + webhooks) · Resend (emails) · pdfkit (PDF)
- Git : push sur GitLab (source de vérité) → mirror GitHub → déploiement Vercel

## Conventions
- UI et contenus en français ; code, identifiants et commits en anglais
- Composants PascalCase, fichiers kebab-case, SQL snake_case
- Commits : Conventional Commits (feat:, fix:, chore:…)
- Zéro `any` ; validation Zod à chaque frontière (formulaires, Route Handlers, env)
- Prix TOUJOURS en centimes (integer) ; calculs de montants côté serveur uniquement

## Conventions API (15)
- Erreurs : forme unique `{ error: { code, message } }` — `code` machine en SCREAMING_SNAKE (voir `src/lib/api/errors.ts`), `message` en français, affichable tel quel, jamais de détail brut Stripe/Supabase/pdfkit/INSEE. Succès : payload direct, jamais d'enveloppe `{ data }`. Helpers dans `src/lib/api/` (`apiError`, `apiSuccess`, `parseJsonBody`, `parseSearchParams`).
- Codes HTTP par situation, jamais improvisés : 400 (validation), 401 (non authentifié), 403 (rôle insuffisant), 404, 409 (conflit), 500 (générique). Pas de 422 ni d'autres codes ad hoc.
- Validation Zod `safeParse` systématique en entrée de chaque Route Handler (body ET query params ET params de route type UUID), jamais de cast/`as`. Une entrée invalide ne doit jamais atteindre la logique métier.
- Blind shipping (01) : aucune réponse d'API, message d'erreur inclus, ne doit exposer un SKU (préfixé `APF-...`) ni le nom du fournisseur.
- Cache : `export const dynamic = 'force-dynamic'` + `Cache-Control: no-store` sur toute route lue en temps réel (panier, checkout, prix, documents, webhook).
- Runtime : `export const runtime = 'nodejs'` explicite sur toute route utilisant pdfkit, le SDK Stripe ou `service_role`.
- Server Action vs Route Handler : formulaire même origine → Server Action (`src/app/**/actions.ts`, ex. auth, compte/pro). Appel programmatique/fetch client/webhook tiers → Route Handler (`src/app/api/**`).
- Rôle tarifaire : jamais lu depuis le client, toujours via `resolvePricingRole()` (lit `profiles.role` en DB).
- Webhook Stripe (`/api/webhooks/stripe`) : EXEMPTÉ de la convention d'erreur ci-dessus — Stripe attend des statuts HTTP bruts.

## Spécifications détaillées
Ne PAS tout relire : lis UNIQUEMENT le fichier docs/ concerné par la tâche en cours.
- 01-overview.md — contexte métier, blind shipping, périmètre V1
- 02-setup.md — installation, structure du repo, outillage local
- 03-modele-donnees.md — schéma PostgreSQL, enums, RLS
- 04-catalogue-produits.md — import catalogue APF, structure produit
- 05-design-css.md — design system light ultra-luxe, tokens Tailwind
- 06-responsive.md — mobile-first, breakpoints, images
- 07-pages.md — arborescence des routes, stratégie de rendu
- 08-calculateur.md — algorithme rouleaux + packs (module phare)
- 09-panier-checkout.md — panier, cross-sell, tunnel d'achat
- 10-paiement.md — Stripe Checkout, webhooks, idempotence
- 11-commandes.md — statuts, BL PDF blind shipping, factures
- 12-livraison.md — frais de port, contraintes transport
- 13-promotions.md — remise pack -5 %, tarifs pros
- 14-auth.md — Supabase Auth, rôles, vérification SIRET
- 15-api.md — Route Handlers, conventions, erreurs
- 16-integrations.md — Stripe, Resend, Storage, simulateur 3D APF
- 17-emails.md — transactionnel (client, APF), délivrabilité
- 18-seo-technique.md — metadata, sitemap, JSON-LD (sans AggregateRating)
- 19-performance.md — Lighthouse 95+, Core Web Vitals
- 20-contenu.md — hub /guides/, conventions éditoriales
- 21-analytics.md — mesure cookieless, événements clés
- 22-rgpd-consentement.md — CGV, mentions légales, consentement
- 23-securite.md — webhooks, RLS, headers, PII
- 24-tests.md — Stripe test mode, calculateur, E2E
- 25-deploiement.md — flux GitLab → GitHub → Vercel
- 26-env-config.md — variables d'environnement

## Mémoire des décisions
À chaque choix technique pris ou modifié : mets à jour docs/decisions.md (date, décision, motif, impact). Consulte-le avant tout arbitrage structurant.
