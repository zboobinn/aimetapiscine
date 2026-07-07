# 07 — Pages et stratégie de rendu

Objectif : arborescence App Router avec le bon mode de rendu par page (SEO + perf).

## Arborescence
- `/` — accueil (SSG) : proposition de valeur, entrée calculateur, catégories.
- `/membrane-armee` (hub, ISR) ; `/membrane-armee/[gamme]` ; `/membrane-armee/[gamme]/[couleur]` — fiche produit (ISR).
- `/accessoires`, `/accessoires/[categorie]`, `/accessoires/[categorie]/[slug]` (ISR).
- `/calculateur` — module phare (shell SSG, logique client — 08).
- `/simulateur-3d` — iframe APF marque blanche (16).
- `/panier` (client), `/commande/confirmation` (SSR, lit la session Stripe).
- `/compte` (SSR protégé) : profil, commandes, factures ; `/compte/pro` : inscription/statut pro.
- `/connexion`, `/inscription`, `/mot-de-passe-oublie`.
- `/guides`, `/guides/[slug]` (SSG — 20).
- `/cgv`, `/mentions-legales`, `/confidentialite`, `/livraison-retours` (SSG — 22).

## Règles de rendu
- Tout l'indexable = SSG ou ISR ; jamais de fiche produit en pur client-side.
- `generateStaticParams` sur les fiches (build complet) ; fallback ISR pour les nouveaux SKU.
- Revalidation à la demande après import catalogue : `revalidatePath` via `/api/revalidate` (04, 15).
- Prix pro : la page statique affiche le prix public ; le prix pro est hydraté côté client après lecture de session — ne pas généraliser le SSR pour ça, et le HTML mis en cache ne doit jamais contenir de prix pro (14).

## Pièges
- Produit `is_active = false` → 404 propre ; slug modifié → redirection 301 (18).
- `noindex` sur panier, confirmation, compte, auth (18).
- Aucune page ne doit contenir de lien sortant vers APF ni de point de fuite (16).
