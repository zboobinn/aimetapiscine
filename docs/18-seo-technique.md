# 18 — SEO technique

Objectif : site « SEO-first » — indexation propre, données structurées valides, zéro risque de pénalité.

## URLs et maillage
- URLs sémantiques stables : `/membrane-armee/uni/bleu-pale`, `/guides/calcul-membrane-piscine`. Slugs figés à la création (04) ; tout changement = 301 permanente.
- Maillage : accueil → catégories → fiches ; guides (20) → fiches ciblées ; fil d'Ariane sur toutes les pages profondes.

## Metadata (Next Metadata API)
- `title` unique < 60 car. (gabarit `{Produit} — {Catégorie} | {Marque}`), `description` 150-160 car. orientée bénéfice, `canonical` autoréférente partout, Open Graph + Twitter Card avec visuel produit.
- `alt` descriptif sur tous les visuels produits (exigence CDC) ; un seul H1 par page, hiérarchie H2/H3 stricte.

## Sitemap et robots
- `sitemap.xml` dynamique : pages statiques + fiches actives + guides. Exclure panier, compte, confirmation, auth, API.
- `robots.txt` : disallow `/api/`, `/compte`, `/panier` ; référence au sitemap. `noindex` sur les pages de tunnel.

## Données structurées (JSON-LD)
- `Product` + `Offer` sur chaque fiche : name, image, sku, brand, prix TTC, `priceCurrency: EUR`, `availability`.
- `Organization` (accueil), `BreadcrumbList` (pages profondes).
- **INTERDIT en V1 : `AggregateRating` / `Review`** — aucun avis réel n'existe ; baliser des notes fictives viole les guidelines Google (risque d'action manuelle qui ruinerait tout le travail SEO). Réactivation uniquement avec un système d'avis authentiques (post-V1). Décision consignée dans decisions.md.
- Valider chaque gabarit au Rich Results Test avant prod.

## Pièges
- Le JSON-LD contient UNIQUEMENT le prix public TTC — jamais le prix pro (14).
- ISR : vérifier que les metadata se régénèrent avec la page à l'import catalogue (`revalidatePath`).
- Redirection apex/www vers une seule forme canonique (25).
