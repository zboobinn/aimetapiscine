# 20 — Contenu éditorial (hub /guides/)

Objectif : structure du hub prête en V1 ; rédaction post-lancement pour capter la longue traîne.

## Structure V1 (à livrer)
- Routes `/guides` (index) et `/guides/[slug]` (SSG), alimentées par MDX dans `content/guides/` (frontmatter : title, description, date, updated, cover, relatedSkus[]).
- Gabarit article : sommaire ancré, encarts « produit lié » (maillage vers fiches — 18), bloc CTA calculateur en fin d'article.
- 1 article pilote rédigé pour valider le gabarit : « Comment calculer la quantité de membrane armée pour sa piscine » (`/guides/calcul-membrane-piscine`) — il pré-vend le calculateur.

## Ligne éditoriale (post-lancement)
- Ton : expert, précis, rassurant — on écrit pour un bricoleur averti, pas pour un moteur.
- Cibles longue traîne : pose (« poser une membrane armée soi-même »), comparatifs (« liner vs membrane armée 150/100e »), préparation du support, entretien, choix des couleurs.
- Chaque article vise UNE intention de recherche : un seul H1, réponse dans les 100 premiers mots, puis profondeur technique.

## Règles
- Aucun contenu publié sans relecture technique : produits techniques = un conseil erroné engage la responsabilité du site.
- Mettre à jour `updated` à chaque révision substantielle (fraîcheur).
- Pas de mention d'APF comme source ou partenaire dans les contenus client.

## Pièges
- Ne pas cannibaliser les pages catégories : les guides informent, les catégories vendent — intentions distinctes, maillage croisé.
- Un hub vide fait mauvaise impression : masquer l'entrée « Guides » de la navigation tant qu'il y a moins de 3 articles publiés.
