# 13 — Promotions et tarification différenciée

Objectif : deux mécanismes V1 seulement — remise pack -5 % et prix pro — calculés exclusivement côté serveur.

## Remise pack (-5 %)
- S'applique aux lignes issues du calculateur (source `pack`) tant que le pack COMPLET est au panier ; retirer un article du pack retire la remise (message explicite).
- Implémentation : `discount_bps = 500` (env `PACK_DISCOUNT_BPS`, 26) sur chaque `order_item` concerné ; remise sur le HT, arrondie LIGNE À LIGNE (`Math.round`) — jamais sur le total (évite les écarts d'un centime en facturation).
- Affichage : prix barré + badge « Pack -5 % » (composant Price, 05).

## Prix pro
- Ce n'est PAS un code promo : `pro_price_ht` du catalogue, servi uniquement si `role = PRO_VERIFIED` lu en DB côté serveur (14).
- Cumul avec la remise pack : OUI (base = pro_price_ht, puis -5 %). Si cette règle change, la consigner dans decisions.md.

## Cadre légal (France)
- Toute annonce de réduction doit référencer un prix réel et praticable (directive Omnibus : prix le plus bas des 30 derniers jours en cas d'annonce de réduction chiffrée). « Pack -5 % » vs prix catalogue courant est conforme tant que le prix catalogue est le prix effectivement pratiqué hors pack — ne jamais gonfler un prix de référence.

## Hors périmètre V1
- Codes promo, ventes flash, soldes, parrainage : rien à implémenter, mais le modèle (`discount_bps` par ligne) les rend possibles sans migration.

## Pièges
- Jamais de calcul de remise côté client : le client AFFICHE, le serveur DÉCIDE (10, 23).
- Marges faibles en V1 : remise paramétrable par env, pas de constante en dur.
