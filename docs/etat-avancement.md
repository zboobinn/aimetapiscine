# État d'avancement — Membranes Armées

Point d'étape régénéré le 2026-07-10 par relecture intégrale de `docs/decisions.md` (397 lignes, entrées D1–D18 + A1–A3), du code (`src/`, `supabase/migrations/`, `scripts/`, `tests/`) et de l'historique git (`git log`, `git show --stat` sur chaque commit de spec). Aucune modification de code effectuée pour ce document. Nombre de tests vérifié en exécutant `pnpm vitest run` au moment de la rédaction : **128 tests, 13 fichiers, tous verts**.

La version précédente (2026-07-09) classait 15, 18, 23 et 24 en « non commencées » — c'était vrai à cette date, mais obsolète depuis : ces quatre specs ont chacune un commit dédié, poussé, avec tests. Corrigé ci-dessous.

## 1. Specs terminées (code présent, cohérent avec la spec)

| Spec | Sujet | État | Notes |
|---|---|---|---|
| 02 | Setup | ✅ | Repo, tooling, structure en place. |
| 03 | Modèle de données | ✅ | 10 migrations locales (`20260707000000` → `20260714210000`). **8 des 10 non poussées sur le projet cloud** (chaque décision correspondante le note explicitement) — voir « Dettes ouvertes ». |
| 04 | Catalogue produits | ⚠️ terminé structurellement, **données factices** | `data/catalog.json` : 8 produits de **test** (tarifs/poids fictifs). `image_url` protégé par contrainte `CHECK` blind-shipping ; `pro_price_ht` retiré des colonnes lisibles par `anon` (23a). |
| 05 | Design CSS | ✅ | Tokens Tailwind v4 (`@theme`), composants `ui/*`. Direction visuelle « Nuancier » tranchée (D1) mais **pas encore appliquée** — voir spec 28. `/design-system` bloqué en 404 en production (23b), toujours accessible en dev. |
| 06 | Responsive | ✅ | Intégré au squelette de pages (07). |
| 07 | Pages | ✅ | Toutes les routes prévues créées, ISR sur catalogue. `/guides` reste un placeholder (contenu réel = spec 20, non fait). |
| 08 | Calculateur | ⚠️ terminé en logique, **coefficients provisoires** | Logique pure + tests Vitest. Rendements accessoires (colle notamment) à refaire dès réception des fiches techniques APF — voir « Bloquants externes ». Le calculateur ne change pas dans la refonte (D5) : déplacé/habillé, pas réécrit. |
| 09 | Panier/checkout | ✅ | Store Zustand (ne stocke que `slug`/quantité, jamais de prix ni de `sku`, 23a), résolution serveur, cross-sell, remise pack branchée. |
| 10 | Paiement Stripe | ✅ | Checkout + webhook validés de bout en bout (test mode) ; idempotence vérifiée (contrainte `unique` sur `stripe_session_id`). Rate limiting sur `/api/checkout` livré en 23b (Postgres, fail-open documenté). |
| 11 | Commandes (BL + facture) | ✅ code, ⚠️ **risque non résolu** | Génération PDF (BL blind shipping + facture), Storage privé, URLs signées, historique de statut via trigger DB, découplage encaissement/génération de documents. Risque D18 non tranché — voir « Dettes ouvertes ». |
| 12 | Livraison | ⚠️ terminé structurellement, **tarifs provisoires** | Deux modes (`included`/`flat`) coexistent, Corse incluse avec surcoût provisoire. Montants réels dépendent des tarifs APF — voir « Bloquants externes ». |
| 13 | Promotions | ✅ | Remise pack -5 % appliquée serveur + facture ; tarifs pros branchés (limite connue du manifeste de pack acceptée, non retouchée en 23b). |
| 14 | Auth (B2C + B2B) | ✅ | Inscription/connexion/reset B2C complet. Parcours pro (SIRET + vérification INSEE optionnelle + activation manuelle) livré. Emails Auth restent en template Supabase par défaut (anglais) tant que le SMTP custom (17) n'est pas branché. |
| 15 | Conventions API | ✅ | Formalisée dans un commit dédié (« spec 15 : API ») : `lib/api/{errors,response,validate}.ts`, toutes les Route Handlers retrofittées sur `{error:{code,message}}`. `UNSAFE_CONTENT` (400) ajouté en 27 pour le rejet de fichier blind-shipping. |
| 17 | Emails transactionnels | ✅ | Confirmation client, ordre d'expédition APF, alerte admin, compte pro activé — opérationnels via Resend, validés par campagne de test manuelle du 2026-07-09 (retest de l'alerte admin inclus et confirmé reçu — dette correspondante close dans `decisions.md`). Sans domaine de production : `onboarding@resend.dev` (provisoire). |
| 18 | SEO technique | ✅ | `robots.ts`/`sitemap.ts` (Metadata Routes), `SEO_ALLOW_INDEXING` (défaut `false`), JSON-LD Product/Breadcrumb/Organization/Website. Constructeur JSON-LD produit déplacé et durci en 27 (`lib/seo/product-jsonld.ts` : `brand`/`seller` figés sur `SITE_BRAND`, `manufacturer` inexprimable au niveau du type). Zéro `AggregateRating`. |
| 23 | Sécurité | ✅ (23a + 23b) | `sku` ne quitte plus jamais le client (renommé `slug` partout), `pro_price_ht` retiré des colonnes `anon`, rate limiting Postgres sur `/api/checkout` (fail-open documenté), headers de sécurité (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy), CSP **Report-Only uniquement** (nonces requis avant de passer en bloquant, non fait). Vérification `x-forwarded-for` distinct par IP non prouvée en prod (testée en dev local uniquement) ; valeurs de rate limit de prod à fixer avant lancement ; `connect-src` à restreindre au sous-domaine Supabase exact. |
| 24 | Tests | ✅ | **128 tests Vitest, 13 fichiers, tous verts** (`pnpm vitest run`, vérifié à la rédaction) : calculateur, pricing/TVA, port, SIRET, PDF blind-shipping, séquencement webhook, garde-fou blind-shipping (55 tests, spec 27). E2E Playwright et intégration RLS/webhook signé toujours hors périmètre V1, comme documenté dans `24-tests.md`. |
| 26 | Env config | ✅ | `lib/env/` : schémas Zod par domaine, accesseurs paresseux, `assertCoreEnv()` au boot (site + Supabase seulement). `BLIND_SHIPPING_DENYLIST` ajouté (27), lu directement via `process.env`, volontairement hors du système de domaines pour ne pas coupler un script d'import catalogue à la validation Stripe/rate-limiting. Plusieurs variables clés restent vides — voir « Bloquants externes ». |
| 27 | Blind shipping — front public | ✅ code et tests, ⚠️ **critère de done non entièrement clos** | Trois vecteurs fermés : EXIF/IPTC/XMP (pipeline `sharp`, jamais `.withMetadata()`), nom de fichier (rejet `UNSAFE_CONTENT`), JSON-LD (`brand`/`seller` figés, `manufacturer` inexprimable), détection à trois passes (D10) avec limite de couverture assumée et documentée (D11/D13/D15). `scripts/resanitize-storage.ts` écrit mais jamais exécuté (aucun bucket Storage public de photos produit n'existe encore). Deux points du critère de done restent ouverts sans action de code possible : D17 (URL de suivi) et D18 (BL physique) — voir « Dettes ouvertes ». |

## 2. Specs non commencées

| Spec | Sujet | État |
|---|---|---|
| 19 | Performance | Non auditée — aucune mention de Lighthouse/Core Web Vitals/`web-vitals` trouvée dans `src/`. |
| 20 | Contenu (/guides) | Toujours un placeholder (`guides-data.ts`, 2 entrées statiques) ; aucun dossier `content/guides/`. |
| 21 | Analytics | Aucune intégration Plausible/Umami trouvée dans `src/`. Le choix lui-même n'a jamais été tranché — voir « Bloquants externes ». |
| 22 | RGPD / consentement | Les 4 pages légales (`cgv`, `mentions-legales`, `confidentialite`, `livraison-retours`) font toujours 20 lignes chacune — stubs. Aucun gestionnaire de consentement dans `src/`. |
| 25 | Déploiement | Flux Git (GitLab → GitHub → Vercel) décidé, remote `origin` local confirmé vers GitLab, mais aucune trace de déploiement Vercel réel (`.vercel/` absent, pas de domaine configuré). |

## 2 bis. Specs planifiées, non commencées (refonte visuelle)

| Spec | Sujet | État |
|---|---|---|
| 28 | Design system « Nuancier » | Doc écrite, **zéro implémentation** — aucune trace de `nuancier`/`pastille`/`hero` dans `src/app/globals.css` ni `src/app/page.tsx`. Direction tranchée (D1), zéro librairie d'animation actée (D2), `animation-timeline` jugée non Baseline (D3). |
| 29 | Page produit | Doc écrite, non implémentée. **Bloquée sur les assets photo** (A3) — chemin critique explicite dans la spec elle-même : « ne pas la fermer sur des placeholders ». |
| 30 | Homepage | Doc écrite, non implémentée. Hero volontairement sans animation (D4). Chemin critique photo partagé avec 29. |
| 31 | Preuve sociale / finition | Doc écrite, non implémentée. Modération a priori des avis avec photo **non négociable** (D9) — en cas de contrainte de temps, la spec dit de couper les View Transitions plutôt que la modération. |

Numérotation (D8) : les specs 27–31 s'insèrent après 18–26 ; `docs/refonte-visuelle.md` et `docs/annexe-brief-photo.md` sont le dossier de recherche/brief, pas des specs.

## 3. Spec reportée

| Spec | Sujet | État |
|---|---|---|
| 16 | Intégrations (simulateur 3D APF) | ⏸ **reportée sine die**. Double blocage : le simulateur n'existe pas encore côté APF, et une version marquée APF ne pourrait de toute façon pas être affichée côté client (blind shipping). Condition de réouverture : APF livre un simulateur ET confirme une version intégrable sans marque. `/simulateur-3d` reste un stub, exclu du sitemap. |

## 4. Bloquants externes

Éléments qui ne dépendent pas du code et qui conditionnent l'avancement de plusieurs specs à la fois :

- **Domaine de production** — prévu **septembre**. Bloque : allow-list Redirect URLs Supabase (14), config Vercel (25), expéditeur email définitif à la place d'`onboarding@resend.dev` (17), `SEO_ALLOW_INDEXING` (18), SMTP custom Resend pour les gabarits Auth français (17).
- **Immatriculation de la société** — prévue **septembre**. `COMPANY_NAME`, `COMPANY_SIREN`, `COMPANY_VAT`, `COMPANY_ADDRESS` resteront vides dans `.env.example` jusque-là — bloquant pour les factures légales (11) et les mentions légales (22).
- **Fiches techniques APF** — tarifs, poids, conditionnements réels (contenu net des bidons de colle/PVC liquide/solvant, la conversion actuelle suppose un bidon de 5 kg non garanti), rendements/coverage exacts. Bloque le calibrage définitif du catalogue (04), du calculateur (08) et des frais de port (12), tous provisoires.
- **Assets photo** (A3) — 4 plans × N coloris + `water_appearance`, brief déjà écrit (`docs/annexe-brief-photo.md`). **Chemin critique des specs 29 et 30** : ces deux specs ne peuvent pas être fermées sur des placeholders.
- **Choix Plausible vs Umami** — décidé cookieless/sans GA4 dès la V1 (2026-07-07), mais le choix entre les deux outils **n'a jamais été tranché**. Bloque le démarrage de la spec 21.
- **Garantie de reprise sur erreur de cote (A1)** — négociation de marge avec APF, pas une décision de design ; câblée derrière `NEXT_PUBLIC_REMAKE_GUARANTEE` (défaut `off`, front fonctionnel dans les 3 cas) mais non arbitrée. Conditionne le contenu réel des specs 29/30.
- **Version marque blanche du simulateur 3D (16)** — à négocier explicitement avec APF, condition bloquante avant toute reprise de la spec 16.
- **Clé API INSEE (Sirene)** — `INSEE_SIRENE_API_KEY` non renseignée ; le parcours pro fonctionne quand même (activation 100 % manuelle), vérification automatique inactive.

## 5. Dettes ouvertes

- **Sortir le projet de OneDrive.** Instabilité de build et exposition de `.env.local`. Non traitée.
- **D17 — URL de suivi transporteur, sans objet.** Aucun transporteur ni numéro de suivi n'existe encore dans le système : il n'y a rien à ouvrir ni à inspecter pour l'instant. Item du critère de done de la spec 27 reporté (pas coché), à réévaluer dès qu'un suivi est branché — ce n'est pas une tâche oubliée, c'est une tâche qui n'a pas encore de matière.
- **D18 — Que met APF physiquement dans le carton ?** Le BL généré par le webhook (11) affiche « APF » en clair et le SKU `APF-...` ; sans risque tant que ce PDF reste un email interne à APF, mais fuite directe s'il est glissé dans le colis livré au client — usage pourtant habituel d'un bon de livraison. **Question ouverte, jamais posée au fournisseur.** Actions possibles une fois la réponse connue : scinder en bon de préparation interne (peut nommer APF) / bon de livraison client (en-tête `aimetapiscine` uniquement), ou confirmer que rien de tel n'accompagne physiquement le colis.
- **Migrations Supabase cloud non appliquées** — 8 des 10 migrations locales (`order_documents`, `order_processing_error`, `pro_insee`, `store_settings`, `email_notifications`, `products_column_privileges`, `products_no_supplier_ref`, `rate_limits`, `drop_redundant_order_index`) restent à pousser (`supabase db push`) avant tout test en environnement partagé. Sans cette application, le rate limiting (23b) tourne en fail-open silencieux — déjà vérifié et documenté, pas une découverte.
- **`scripts/resanitize-storage.ts` jamais exécuté** — écrit (27) mais aucun bucket Storage public de photos produit n'existe encore pour le faire tourner utilement.

## 6. Vérification de `docs/decisions.md`

Relecture intégrale (397 lignes, entrées D1–D18 + A1–A3) comparée au code, aux migrations et à l'historique git :

- Chaque migration SQL présente dans `supabase/migrations/` a une décision correspondante ; les 8 marquées « non poussées » le sont de façon cohérente avec l'état réel du dossier local.
- Les correctifs significatifs de l'historique git (fuite APF, bug HT/TTC, police PDF, découplage webhook, port absent de la facture, prix pro live, migration `sku`→`slug`, rate limiting, JSON-LD durci) sont journalisés, y compris les items encore ouverts (D16, D17, D18, A1–A3).
- Deux corrections apportées à `docs/decisions.md` et `docs/29-page-produit.md` à l'occasion de cette relecture : chemin `docs/specs/annexe-brief-photo.md` (inexistant) corrigé en `docs/annexe-brief-photo.md` (3 occurrences) ; dette « retest email d'alerte admin » marquée close (déjà faite le 2026-07-09, confirmée reçue).
- Point de vigilance non corrigé ici (documentaire, pas structurant) : D16 propose un critère de vérification (`git grep -ril "<token>" -- "src/**" ":!src/lib/server/**"`) dont le motif d'exclusion ne correspond à aucun répertoire existant du dépôt — rejouée sans cette exclusion inopérante, la commande remonte des fichiers sous `src/`, tous des commentaires de documentation (vérifié par échantillon), jamais une valeur exécutée. Sans risque réel, mais l'affirmation « → vide » ne tient plus littéralement.
