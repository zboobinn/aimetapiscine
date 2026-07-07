# 24 — Tests et QA

Objectif : confiance maximale sur trois zones : l'algorithme du calculateur, l'argent (Stripe), la chaîne de commande.

## Tests unitaires (Vitest) — priorité n°1 : le calculateur (08)
- Fonctions pures testées exhaustivement : cas nominaux, bornes (piscine min/max), arrondis (`ceil` rouleaux), coefficient 1,15 vs 1,20 avec escalier, périmètre profils, rendements accessoires.
- Cas pièges à couvrir : surface juste sous/sur un multiple de 41,25 m² ; dimensions décimales (8,45 m) ; escalier modifiant le coefficient.
- Règles de prix (13) : remise ligne à ligne, cumul prix pro + pack, arrondis en centimes.

## Tests d'intégration
- Webhook Stripe : événement signé valide → commande créée UNE fois ; événement REJOUÉ → aucun doublon ; signature invalide → 400.
- RLS : avec le JWT du user A, impossible de lire les commandes de B ; anonyme ne lit que les produits actifs.
- Import catalogue : upsert idempotent, désactivation des SKU absents (04).

## E2E (Playwright) — un parcours critique complet
- Calculateur (8×4×1,5 m, escalier roman) → pack au panier → checkout Stripe test (carte 4242…) → confirmation → commande `SENT_TO_SUPPLIER` en DB → emails partis (boîtes de recette).
- Variante pro : connexion PRO_VERIFIED → prix HT remisés visibles → achat.

## Checklist pré-lancement
- [ ] Bout en bout en mode test, puis UNE commande live de faible montant (remboursée).
- [ ] Webhook prod + secret live configurés ; échec simulé → retry Stripe constaté.
- [ ] Emails vérifiés (client + boîte APF de recette) : contenu, pièces jointes, AUCUN terme APF côté client.
- [ ] BL PDF conforme : mention BLIND SHIPPING, zéro mention APF, adresse correcte, pas de prix.
- [ ] Facture : numérotation continue, mentions société complètes (11).
- [ ] Lighthouse ≥ 95 sur accueil, fiche, calculateur (19) ; Rich Results Test OK (18).
- [ ] Pages légales en ligne, médiateur désigné (22).
