# 06 — Responsive

Objectif : parcours complet (calculateur → paiement) irréprochable sur mobile.

## Approche
- Mobile-first : styles de base = mobile, `md:`/`lg:` pour élargir. Breakpoints Tailwind par défaut.
- Grilles produits : 1 colonne mobile → 2 (sm) → 3-4 (lg), cartes à hauteur homogène.
- Le calculateur (08) est LE cas critique mobile : une étape par écran, champs numériques `inputmode="decimal"`, boutons pleine largeur, résumé sticky en bas.
- Panier/checkout : récapitulatif repliable, CTA de paiement toujours visible (sticky bottom).
- Navigation : header épuré, menu hamburger mobile, pas de méga-menus.

## Images
- `next/image` avec attribut `sizes` réaliste par contexte (hero, grille, fiche) — ne jamais servir du 2000 px sur mobile.
- Ratio réservé (aspect-ratio) partout → zéro CLS (19).

## Données techniques
- Tableaux de caractéristiques : empilement clé/valeur sur mobile, pas de scroll horizontal.

## Pièges
- Tester au doigt steppers de quantité et champs de dimensions : cibles ≥ 44 px.
- L'iframe du simulateur 3D APF (16) : conteneur responsive à ratio fixe + fallback si écran trop étroit.
- Vérifier le rendu clavier virtuel ouvert : le CTA sticky ne doit pas être masqué.
