# État d'avancement — Membranes Armées

Point d'étape établi le 2026-07-09 par relecture du code (`src/`, `supabase/migrations/`), de l'historique git et de `docs/decisions.md`. Aucune modification de code effectuée pour ce document.

## 1. Specs terminées (code présent, cohérent avec la spec)

| Spec | Sujet | État | Notes |
|---|---|---|---|
| 02 | Setup | ✅ | Repo, tooling, structure en place. |
| 03 | Modèle de données | ✅ | Migrations `20260707000000_init_schema.sql` → `20260711000000_store_settings.sql` appliquées en local ; **certaines non poussées sur le projet cloud** (cf. §3). |
| 04 | Catalogue produits | ⚠️ terminé structurellement, **données factices** | `data/catalog.json` : 8 produits de **test** (tarifs/poids fictifs). Prix/stock désormais lus en live depuis `products` (DB), mais toujours des valeurs de test. |
| 05 | Design CSS | ✅ | Tokens Tailwind v4 (`@theme`), composants `ui/*`, page démo `/design-system` à retirer avant prod. |
| 06 | Responsive | ✅ | Intégré au squelette de pages (07). |
| 07 | Pages | ✅ | Toutes les routes prévues créées, ISR sur catalogue, `/guides` en placeholder (contenu réel = spec 20). |
| 08 | Calculateur | ⚠️ terminé en logique, **coefficients provisoires** | Logique pure + tests Vitest. Rendements accessoires (colle notamment) **à refaire dès réception des fiches techniques APF** (décision 2026-07-07, non résolue). |
| 09 | Panier/checkout (panier) | ✅ | Store Zustand + résolution serveur, cross-sell, remise pack branchée. |
| 10 | Paiement Stripe | ✅ | Checkout + webhook validés de bout en bout (test mode) ; idempotence vérifiée. Rate limiting sur `/api/checkout` **non implémenté** (mentionné en 23). |
| 11 | Commandes (BL + facture) | ✅ | Génération PDF (BL blind shipping + facture), Storage privé, URLs signées, historique de statut via trigger DB. Envoi email à APF opérationnel depuis 17. |
| 12 | Livraison | ⚠️ terminé structurellement, **tarifs provisoires** | Deux modes (`included`/`flat`) coexistent, Corse incluse avec surcoût provisoire. Montants réels dépendent des tarifs APF (§3). |
| 13 | Promotions | ✅ | Remise pack -5 % appliquée serveur + facture ; tarifs pros déjà branchés. |
| 14 | Auth (B2C + B2B) | ✅ | Inscription/connexion/reset B2C complet. Parcours pro (SIRET + vérification INSEE optionnelle + activation manuelle) livré 2026-07-10. Emails Auth restent en anglais/template Supabase par défaut tant que le SMTP custom (17) n'est pas branché. |
| 17 | Emails transactionnels | ✅ | Confirmation client (facture jointe), ordre d'expédition APF (BL joint), alerte admin, compte pro activé — tous opérationnels via Resend, validés par campagne de test manuelle (decisions.md, 2026-07-09). Sans domaine de production : expéditeur `onboarding@resend.dev` (provisoire), `EMAIL_OVERRIDE_TO` requis pour tester en dev tant qu'aucun domaine n'est vérifié dans Resend. SMTP custom Auth reste hors périmètre. |

## 2. Specs non commencées

| Spec | Sujet | État |
|---|---|---|
| 15 | Conventions API | Pas de doc/décision dédiée ; les Route Handlers existantes suivent des conventions ad hoc, jamais formalisées. |
| 18 | SEO technique | Aucun sitemap, robots.txt, ni JSON-LD trouvés dans `src/app`. |
| 19 | Performance | Non auditée (pas de mesure Lighthouse trouvée dans le repo). |
| 20 | Contenu (/guides) | `content/guides/` vide ; page liste en placeholder (`guides-data.ts`). |
| 21 | Analytics | Aucune intégration Plausible/Umami trouvée dans le code, malgré la décision prise (2026-07-07) de les utiliser dès la V1. |
| 22 | RGPD / consentement | Pages légales = stubs de 19 lignes chacune (`cgv`, `mentions-legales`, `confidentialite`, `livraison-retours`), contenu réel non rédigé ; pas de gestionnaire de consentement (même "dormant") visible dans le code. |
| 23 | Sécurité | RLS et séparation client/serveur suivies au fil de l'eau (03, 14), mais pas de revue dédiée ; rate limiting `/api/checkout` non fait ; headers de sécurité non vérifiés. |
| 24 | Tests | Seuls les tests unitaires du calculateur existent (5 fichiers, `src/features/calculator/`). Pas de tests Stripe automatisés (validation faite manuellement via `stripe listen`), pas d'E2E. |
| 25 | Déploiement | Flux Git (GitLab→GitHub→Vercel) décidé (2026-07-07) mais pas de trace de déploiement Vercel réel dans le repo (pas de `vercel.json`, pas de domaine configuré). |
| 26 | Env config | Squelette solide (`lib/env/`, validation par domaine), mais plusieurs variables clés restent vides (§3). |

## 2 bis. Specs reportées

| Spec | Sujet | État |
|---|---|---|
| 16 | Intégrations (simulateur 3D APF) | ⏸ reportée sine die (dépendance APF + contrainte blind shipping) — voir decisions.md, 2026-07-09. Stub visuel seul (`/simulateur-3d`), rien à intégrer tant qu'APF n'a ni simulateur ni version marque blanche. |

## 3. Points en attente (bloquants externes)

Ces éléments ne dépendent pas du code et bloquent la mise en production, indépendamment de l'avancement des specs :

- **Données APF réelles** : tarifs, poids, conditionnements (notamment le contenu net des bidons de colle/PVC liquide/solvant — cf. décision 2026-07-07 sur le calculateur), rendements/coverage exacts. Le catalogue et les coefficients du calculateur (08) tournent avec des données de test.
- **Frais de port réels** : `SHIPPING_FLAT_FEE_CENTS`, `SHIPPING_CORSICA_SURCHARGE_CENTS`, calibrage du mode `included` — tous provisoires (décision 2026-07-08). Choix définitif du `SHIPPING_MODE` à faire avant lancement.
- **Immatriculation de la société** : `COMPANY_NAME`, `COMPANY_SIREN`, `COMPANY_VAT`, `COMPANY_ADDRESS` sont vides dans `.env.example` — bloquant pour les factures légales (11) et les mentions légales (22).
- **Clé API INSEE (Sirene)** : `INSEE_SIRENE_API_KEY` non renseignée — le parcours pro fonctionne quand même (activation 100 % manuelle), mais la vérification automatique reste inactive (`insee_status = not_configured`).
- **SMTP custom Resend** : non configuré dans Supabase Studio → bloque uniquement les emails Auth personnalisés en français désormais (confirmation d'adresse, reset mot de passe) ; la spec 17 elle-même (confirmation client, BL vers APF, alertes admin, compte pro activé) est levée, opérationnelle via l'API Resend directe sans dépendre de ce SMTP.
- **Domaine de production** : non défini → allow-list des Redirect URLs Supabase (14), config Vercel (25) et expéditeur email définitif (17, actuellement `onboarding@resend.dev` provisoire) à finaliser une fois connu.
- **Migrations Supabase cloud** : plusieurs migrations locales (`20260708000000_order_documents.sql`, `20260709000000_order_processing_error.sql`, `20260710000000_pro_insee.sql`, `20260711000000_store_settings.sql`, `20260712000000_email_notifications.sql`) sont notées comme **non poussées** sur le projet cloud dans les décisions correspondantes — à vérifier/appliquer (`supabase db push`) avant tout test en environnement partagé.
- **Contenu éditorial** : guides (`/guides`, spec 20) et pages légales (22) à rédiger — actuellement vides ou stubs.
- **Version marque blanche du simulateur 3D (16)** : à négocier explicitement avec APF (iframe personnalisable ou API sans mention du fournisseur) — condition bloquante avant toute reprise de la spec 16, cf. decisions.md 2026-07-09.

## 4. Vérification de `docs/decisions.md`

Relecture intégrale du fichier (175 lignes, 20 entrées datées du 2026-07-07 au 2026-07-10) comparée au code et aux migrations présentes dans le repo :

- Chaque migration SQL présente dans `supabase/migrations/` a une décision correspondante.
- Les correctifs significatifs retrouvés dans l'historique git (fuite mention APF, bug HT/TTC panier/paiement, police PDF, découplage webhook, port absent de la facture, prix pro live) sont bien journalisés.
- Aucune décision structurante non documentée n'a été identifiée dans le code actuel (routes API, `lib/`, `features/`) qui ne soit pas déjà couverte par une entrée existante.
- **Aucune décision manquante à ajouter** à ce stade — le journal est à jour par rapport au code livré. Point de vigilance pour la suite : les prochaines specs à démarrer (17 emails, 18 SEO, 20 contenu, 21 analytics, 22 RGPD) impliqueront des choix de dépendances (Resend/react-email, sitemap, Plausible vs Umami, gestionnaire de consentement) qui devront être tranchés et journalisés au moment de leur implémentation.
