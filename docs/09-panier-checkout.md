# 09 — Panier et tunnel d'achat

Objectif : panier fluide (produits unitaires + packs calculateur), tunnel court vers Stripe Checkout.

## Panier
- État client (Zustand) persisté en localStorage ; lignes `{sku, quantity, source: 'catalog'|'pack', packId?}`.
- Les lignes d'un même pack sont groupées visuellement (badge -5 %, lien « recalculer »).
- Cross-sell : à l'ajout d'une membrane seule, proposer les accessoires compatibles (mêmes rendements que 08) — suggestion, jamais ajout forcé.
- Le panier ne stocke JAMAIS de prix : uniquement SKU + quantités. Les prix sont résolus à l'affichage et au checkout côté serveur, selon le rôle (TTC pour USER/anonyme, HT remisé + TTC pour PRO_VERIFIED — 14).

## Tunnel
1. `/panier` : récap, quantités éditables, frais de port (12), seuil de franco affiché si l'option retenue en comporte un.
2. Payer → `POST /api/checkout` : le serveur revalide tout (stock, prix rôle, remises, port) et crée la Stripe Checkout Session (10).
3. Adresse collectée par Stripe Checkout (`allowed_countries: ['FR']` — 12).
4. Retour `/commande/confirmation?session_id=…` : récap + prochaines étapes.

## Règles
- Vérifier `in_stock` et `is_active` au checkout ; refus propre avec message clair et purge de la ligne.
- Achat invité autorisé en B2C (email collecté par Stripe) ; création de compte proposée, jamais bloquante.
- `cancel_url` → `/panier` : le panier survit à un paiement annulé.

## Pièges
- Aucun montant venant du client n'est utilisé : le serveur est l'unique source des prix (10, 23).
- Produit désactivé entre l'ajout et le checkout : gérer explicitement (message + retrait), pas d'erreur 500.
