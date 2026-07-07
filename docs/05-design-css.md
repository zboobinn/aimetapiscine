# 05 — Design system (light, ultra-luxe, minimaliste)

Objectif : identité premium cohérente, implémentée en tokens Tailwind.

## Direction artistique
- Light theme unique : fonds blanc/off-white (`#FFFFFF`, `#FAFAF8`), texte encre quasi noir (`#141414`), UN accent sobre (bleu profond « piscine », ex. `#0E4D64`) réservé aux CTA et liens.
- Luxe = retenue : white space généreux, peu de bordures, ombres très douces ou absentes, aucun dégradé criard.
- Typographie via `next/font` (self-hosted) : sans-serif géométrique — ex. Manrope (titres, graisse 500-600, letter-spacing légèrement négatif) + Inter (texte). Deux familles max.
- Imagerie : visuels produits APF sur fonds neutres, grands, respirants.

## Tokens (tailwind.config)
- Étendre `colors` (brand, ink, surface), `fontFamily`, `borderRadius` (4-8 px, identique partout), espacement en multiples de 4.
- Interdire les valeurs arbitraires (`text-[#xyz]`) hors exception justifiée : tout passe par les tokens.

## Composants de base
- Button (primary/secondary/ghost), Input + états d'erreur, Card produit, Badge (stock, « Pack -5 % »), Stepper (calculateur), Price (gère TTC/HT selon rôle + prix barré — 13/14).
- Focus visible (anneau accent) sur tout élément interactif : navigation clavier obligatoire.

## Accessibilité minimale intégrée
- Contrastes AA (4.5:1 texte courant) — vérifier l'accent sur fond clair.
- Texte de base 16 px ; cibles tactiles ≥ 44 px (06).

## Pièges
- Le minimalisme ne doit pas effacer les repères e-commerce : prix, disponibilité et CTA restent immédiatement identifiables.
- Un seul accent : multiplier les couleurs tue le positionnement luxe.
- Aucune font via CDN externe (perf + RGPD) : `next/font` uniquement (19, 22).
