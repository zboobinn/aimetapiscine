# 21 — Analytics (cookieless V1)

Objectif : mesurer trafic et conversion dès le jour 1, sans bannière requise, prêt pour la pub future.

## Outil
- Plausible (ou Umami self-hosted si budget zéro) : sans cookies, données UE, exempté de consentement (CNIL) en configuration standard.
- Script en `lazyOnload` (19), proxifié via rewrite Next (ex. `/stats/js/script.js`) pour fiabiliser la mesure.

## Événements à instrumenter (nommage figé, en anglais)
- `calculator_started`, `calculator_completed` (props : surface, rolls)
- `pack_added_to_cart`, `product_added_to_cart`
- `checkout_started`, `purchase` (props : valeur TTC, nb d'items — aucune donnée personnelle)
- `pro_signup_submitted`
- Funnel clé : visite → calculator_completed → pack_added_to_cart → purchase.

## Règles
- AUCUNE donnée personnelle dans les événements (ni email, ni identifiant client en clair).
- Objectifs configurés dans l'outil : purchase, calculator_completed.
- Revue hebdo simple : sessions, taux de complétion calculateur, taux de conversion, panier moyen (croisé avec Stripe).

## Préparation pub (post-lancement)
- Meta Pixel / Google Ads = consentement PRÉALABLE obligatoire : activer les catégories marketing de la bannière (22) AVANT tout chargement de tag. Le branchement se fait via le gestionnaire de consentement dormant, sans refonte.
- Utiliser des UTM propres dès la V1 : les futures campagnes seront mesurables sans changement.

## Pièges
- Ne pas installer GA4 « en attendant » : il déclencherait immédiatement l'obligation de bannière complète pour un besoin déjà couvert.
- Vérifier que le proxy du script passe la CSP (23).
