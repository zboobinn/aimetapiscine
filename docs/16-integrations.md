# 16 — Intégrations tierces

Objectif : recenser chaque service externe, son rôle et ses règles d'usage.

## Stripe (paiement)
- Checkout + webhooks uniquement (10). Clés test/live séparées (26). Le dashboard Stripe = back-office paiements V1.

## Resend (emails transactionnels)
- Domaine d'envoi propre vérifié (SPF/DKIM/DMARC — 17). Clé API côté serveur uniquement.

## Supabase (DB, Auth, Storage)
- Storage : buckets PRIVÉS `delivery-notes/` (BL) et `invoices/` (factures). Accès par URL signées à durée courte (~24 h pour l'email APF ; régénérées à la demande dans `/compte`).

## Simulateur 3D APF (marque blanche)
- Iframe sur `/simulateur-3d` : conteneur responsive à ratio fixe (06), `title` accessible, chargement en façade (image + bouton « Lancer le simulateur ») — jamais chargée d'office (19).
- Exigence contractuelle : AUCUN point de fuite — pas de logo APF cliquable, pas de lien sortant, pas de menu externe. Si la version fournie contient des liens, exiger la version marque blanche ; sinon, ne pas lancer le module.
- CSP : `frame-src` limité au domaine exact de l'iframe (23).
- Fallback si indisponible : visuel + lien vers le calculateur (08).

## Annuaire SIRET
- V1 : vérification manuelle via l'annuaire public INSEE. V2 possible : API Sirene pour automatiser — à consigner dans decisions.md le jour venu.

## Pièges
- Une clé par service dans l'env (26), jamais en dur ; une seule instanciation par client (`lib/stripe.ts`, `lib/resend.ts`…).
- Toute future intégration marketing (Pixel, Ads) passe D'ABORD par le consentement (21, 22).
