# 10 — Paiement (Stripe)

Objectif : encaissement fiable via Stripe Checkout, automatisation déclenchée par webhook.

## Intégration
- Stripe Checkout hébergé (pas d'Elements en V1) : aucune donnée carte ne transite par nos serveurs.
- Session créée serveur (`/api/checkout`) : `line_items` en `price_data` dynamique (centimes), prix recalculés selon rôle + remise pack (13) + port (12).
- TVA : prix HT en base, TTC calculé serveur (20 %). Les pros paient aussi la TVA (vente domestique) — la remise pro porte sur le HT.
- `metadata` : `user_id` (ou vide si invité), empreinte du panier, `pack_ids`.
- Moyens de paiement V1 : carte (Apple/Google Pay natifs via Checkout). PayPal éventuel post-V1 — noter dans decisions.md le cas échéant.

## Webhook (`/api/webhooks/stripe`)
- Événement pivot : `checkout.session.completed` ; écouter aussi `checkout.session.expired` (log).
- Vérification de signature OBLIGATOIRE (`stripe.webhooks.constructEvent`, body brut — 15/23).
- IDEMPOTENCE : `stripe_session_id` unique en DB ; événement déjà traité → 200 immédiat, zéro retraitement.
- Traitement : créer `orders` + `order_items` (snapshot prix) en `PAID` → générer le BL (11) → envoyer les emails (17) → passer en `SENT_TO_SUPPLIER`.
- Répondre 200 vite ; en cas d'échec interne, laisser Stripe retenter (ne pas avaler l'erreur).

## Pièges
- Recalculer les prix depuis la DB au moment de la session : ne JAMAIS accepter un montant client.
- Le webhook peut arriver AVANT le retour navigateur : la page de confirmation tolère une commande pas encore visible (polling court).
- Secrets test/live strictement séparés par environnement (26) ; `stripe listen` en dev (02).
- Surveiller les échecs de webhook dans le dashboard Stripe (24).
