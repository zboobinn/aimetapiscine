# 12 — Livraison

Objectif : frais de port simples, rentables, lisibles — France métropolitaine uniquement.

## Décision tarifaire (voir docs/decisions.md — EN ATTENTE)
- Option A : port intégré au prix de chaque rouleau (~+15 €/rouleau) → affichage « Livraison offerte » (fort levier conversion ; marge réduite sur 1 rouleau, meilleure sur volume).
- Option B : forfait unique ~40 € par commande, quel que soit le volume.
- Implémenter derrière UNE interface `getShippingFee(cart, role)` pilotée par env (`SHIPPING_MODE`, 26) pour basculer sans toucher au checkout.

## Règles V1
- Zone : France métropolitaine — `allowed_countries: ['FR']` côté Stripe + contrôle serveur du code postal (exclure 971-976, 98x ; Corse 20x à trancher : surcoût transporteur probable sur rouleaux longs → decisions.md).
- Si option B : le port est une ligne dédiée de la session Stripe (`shipping_options`), jamais fondu silencieusement dans les totaux.
- Afficher mode et délai indicatif (« Expédié par notre partenaire logistique sous X jours ») — formulation blind shipping, sans nommer APF ni son transporteur.

## Données
- `weight_grams` stocké dès la V1 (04) : indispensable pour une tarification au poids/volume en V2.

## Pièges
- Rouleaux = colis longs et lourds : vérifier avec APF les contraintes réelles de livraison (camion, hayon, prise de RDV) et les refléter dans les délais annoncés et les CGV (22).
- Page `/livraison-retours` : conditions de réception (vérification du colis, réserves écrites sur le bon du transporteur) — crucial pour les litiges transport, fréquents sur ce type de produit.
