# 12 — Livraison

Objectif : frais de port simples, rentables, lisibles — France métropolitaine uniquement.

## Décision tarifaire (voir docs/decisions.md — 2026-07-08)
Les deux options coexistent, basculables sans redéploiement de code via `SHIPPING_MODE` :
- `included` (défaut) : port intégré au prix de chaque rouleau → affichage « Livraison offerte ».
- `flat` : forfait unique `SHIPPING_FLAT_FEE_CENTS` (~40 €) par commande, quel que soit le volume.

**Tous les montants sont PROVISOIRES** tant qu'APF n'a pas transmis ses tarifs réels — `SHIPPING_FLAT_FEE_CENTS`, `SHIPPING_CORSICA_SURCHARGE_CENTS`, ET le calibrage du mode `included` (~15 €/rouleau actuellement supposé fondu dans les prix de test de `data/catalog.json`, 04). Si le vrai coût transporteur diffère, recalculer les prix produit — pas seulement les variables d'env.

Implémenté derrière UNE interface `getShippingFee(cart, role, shippingAddress?)` (`src/lib/shipping/get-shipping-fee.ts`) pilotée par env (`SHIPPING_MODE`, 26) — un seul point à changer pour basculer, sans toucher au checkout.

## Corse
Incluse dans la zone de livraison (pas d'exclusion), avec un surcoût transporteur `SHIPPING_CORSICA_SURCHARGE_CENTS` (PROVISOIRE, à confirmer avec APF) ajouté au calcul dans LES DEUX modes dès qu'un code postal 2A/2B (`20xxx`) est détecté (`src/lib/shipping/postal-code.ts`).

## Règles V1
- Zone : France métropolitaine, Corse incluse — `allowed_countries: ['FR']` côté Stripe (ces territoires ont des codes pays ISO distincts, donc déjà exclus par Stripe) + contrôle serveur du code postal en défense en profondeur (exclure 971-976, 98x — `isExcludedOverseasPostalCode()`), appliqué à la fois sur l'estimation `/panier` et au moment de créer la session `/api/checkout` (rejet 422, message clair).
- Le port (mode `flat`, ou surcoût Corse même en mode `included`) est une ligne dédiée de la session Stripe (`shipping_options`), jamais fondu silencieusement dans les totaux.
- Afficher mode et délai indicatif (« Expédié par notre partenaire logistique sous X jours ») — formulation blind shipping, sans nommer APF ni son transporteur.
- Limite V1 assumée : le code postal saisi sur `/panier` (pour l'estimation et le surcoût Corse) n'est pas nécessairement celui que l'acheteur saisira ensuite dans le formulaire d'adresse hébergé par Stripe — seul `allowed_countries` bloque formellement, le check code postal reste une défense en profondeur côté site.

## Données
- `weight_grams` stocké dès la V1 (04) : indispensable pour une tarification au poids/volume en V2.

## Pièges
- Rouleaux = colis longs et lourds : vérifier avec APF les contraintes réelles de livraison (camion, hayon, prise de RDV) et les refléter dans les délais annoncés et les CGV (22).
- Page `/livraison-retours` : conditions de réception (vérification du colis, réserves écrites sur le bon du transporteur) — crucial pour les litiges transport, fréquents sur ce type de produit.
