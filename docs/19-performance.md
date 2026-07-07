# 19 — Performance (Lighthouse 95+, Core Web Vitals)

Objectif : score 95+ mobile/desktop sur les gabarits critiques ; LCP < 2 s, CLS < 0,1, INP < 200 ms.

## Rendu
- RSC par défaut : `"use client"` limité à l'interactif (calculateur, panier, steppers). Aucun state manager chargé sur les pages statiques.
- SSG/ISR pour tout l'indexable (07) : TTFB quasi nul via le CDN Vercel.
- `next/dynamic` pour les modules lourds non critiques.

## Images (poste n°1 d'un e-commerce)
- `next/image` partout : AVIF/WebP automatiques, `sizes` réaliste par contexte, lazy par défaut.
- Image LCP (hero, visuel principal de fiche) : `priority`, jamais lazy.
- Dimensions toujours déclarées (ratio réservé) → CLS 0 sur les grilles.

## Fonts et JS
- `next/font` (self-hosted, `display: swap`), 2 familles max, sous-ensemble latin.
- Budget JS surveillé (`@next/bundle-analyzer`) ; Stripe.js chargé uniquement au moment du checkout ; script analytics (21) en `lazyOnload`.

## Mesure et garde-fous
- Audit Lighthouse systématique (idéalement Lighthouse CI) sur les 3 gabarits critiques : accueil, une fiche produit, le calculateur.
- Vercel Speed Insights (RUM) activé pour suivre les CWV réels post-lancement.

## Pièges
- L'iframe du simulateur APF est le principal risque perf : TOUJOURS derrière une façade cliquable (16), jamais chargée d'office.
- Google Fonts via CDN interdit (perf + RGPD — 05, 22).
- Viser 95+ STABLE, pas 100 au détriment de l'UX : c'est l'exigence du CDC.
