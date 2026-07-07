# 08 — Calculateur expert (module phare)

Objectif : transformer les dimensions d'un bassin rectangulaire en « Pack Prêt à Poser » ajouté au panier en un clic.

## Parcours (4 étapes, une par écran)
1. Forme (V1 : rectangle uniquement, UI extensible) + dimensions L / l / P en mètres (2 décimales max ; bornes réalistes : L 2-25, l 1-15, P 0,5-3).
2. Type d'escalier (aucun / droit / roman / plage immergée…) — chaque option ajoute une surface forfaitaire paramétrée.
3. Calcul avec affichage progressif (skeleton court — pas de fausse attente longue).
4. Résultat : pack détaillé ligne par ligne, remise -5 % appliquée (13), bouton d'ajout global au panier.

## Algorithme (fonctions pures, testées unitairement — 24)
- Surface nette = fond (L×l) + parois (2×(L+l)×P) + surface escalier.
- Surface brute = nette × coefficient de perte (env `LOSS_COEFF_BASE` = 1,15 ; `LOSS_COEFF_STAIRS` = 1,20 si escalier — 26).
- Rouleaux = `ceil(brute / roll_area_m2)` — lire 41,25 m² depuis le produit (04), ne pas coder en dur.
- Accessoires proportionnels depuis `coverage` du catalogue : feutre (m²), colle (kg/m²), PVC liquide (ml de soudure), profils Hung (périmètre = 2×(L+l)), solvant. Arrondi SUPÉRIEUR à l'unité vendable.
- Sortie : liste `{sku, quantity, motif}` — le `motif` (« pour 52 m² de parois ») alimente la réassurance UI.

## Règles produit
- Le pack est un assemblage dynamique, PAS un SKU : la remise s'applique ligne à ligne (13).
- Gamme/couleur de membrane choisies à l'étape résultat (les quantités en sont indépendantes).
- Résultat partageable : entrées sérialisées dans l'URL (`/calculateur?l=8&w=4&d=1.5&stairs=roman`).

## Pièges
- Toute la logique dans `features/calculator/` en fonctions pures (aucun accès réseau) : le serveur ré-exécute la MÊME logique pour valider quantités et prix au checkout (10).
- Arrondir les quantités AVANT le calcul des prix ; jamais d'arithmétique flottante sur des centimes.
- Le client garde son résultat comme « liste de courses » : c'est assumé (outil d'autorité SEO) — maximiser la conversion sur place via la remise pack et la simplicité de l'ajout global.
