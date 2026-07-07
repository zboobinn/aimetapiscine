# 04 — Catalogue produits (import APF)

Objectif : transformer les tarifs PDF APF en catalogue structuré, ré-importable à chaque mise à jour tarifaire.

## Source et format pivot
- Source : catalogues tarifaires APF en PDF → saisie/extraction vers UN fichier pivot `data/catalog.json` versionné dans Git.
- Schéma d'une entrée : `sku`, `name`, `category`, `gamme` (uni, imprimé, 3D…), `couleur`, `base_price_ht` (centimes), `pro_price_ht`, `vat_rate`, `weight_grams`, `roll_area_m2`, `unit` (rouleau, bidon, barre…), `coverage` (rendement : m² ou ml couverts par unité — sert au calculateur 08), `image`.
- Validation Zod du fichier complet AVANT import : une entrée invalide = import annulé.

## Script d'import (`scripts/import-catalog.ts`)
- IDEMPOTENT : upsert par `sku` (insert si nouveau, update prix/stock si existant, `is_active = false` pour les SKU absents du fichier).
- Journal de sortie : créés / mis à jour / désactivés — à relire avant chaque mise en prod.
- Exécution : `pnpm catalog:import` (clé service_role, jamais côté client) ; en prod, suivi d'un appel à `/api/revalidate` (07, 15).

## Structuration
- Membranes déclinées par gamme × couleur : chaque combinaison = un produit (un SKU APF). Pas de système de variantes complexe en V1.
- `slug` généré : `membrane-armee-{gamme}-{couleur}`, `feutre-{ref}`… Stable : ne JAMAIS regénérer un slug existant (SEO, 18).
- Images : renommées par SKU, optimisées, dans `public/products/` en V1.

## Données consommées ailleurs
- `roll_area_m2` + `coverage` → calculateur (08) ; `weight_grams` → livraison (12) ; `pro_price_ht` → affichage conditionnel (14).

## Pièges
- Confirmer que les prix PDF APF sont HT ; conversion en centimes sans arithmétique flottante (parser la chaîne, `Math.round`).
- Ne pas inventer les rendements accessoires : les ratios (colle/m², solvant/ml de soudure…) viennent des fiches techniques APF et vivent dans `catalog.json`, jamais codés en dur.
