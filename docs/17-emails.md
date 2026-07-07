# 17 — Emails transactionnels (Resend)

Objectif : trois emails critiques, fiables, sans fuite APF côté client.

## Emails V1
1. **Confirmation de commande (client)** : récap lignes/quantités, montants TTC (détail HT+TVA si pro), adresse, délai indicatif, facture PDF jointe (11). Expéditeur : `commandes@{domaine}`.
2. **Ordre d'expédition (APF, interne)** : au contact logistique APF (`APF_LOGISTICS_EMAIL`, 26), BL PDF joint, objet : `[BLIND SHIPPING] Commande {n°}`. Corps sobre : n° de commande, lignes, consigne « ne joindre aucune facture APF au colis ».
3. **Compte pro activé** : confirmation PRO_VERIFIED, accès aux prix HT remisés.
+ gabarits Supabase Auth (vérification d'adresse, reset mot de passe) personnalisés en français, aux couleurs du site.

## Implémentation
- Gabarits `react-email` (header/footer partagés : mentions société, contact). Pas de lien de désinscription requis : transactionnel pur, pas de marketing.
- Envoi côté serveur uniquement, déclenché par le webhook (10).
- L'échec de l'email APF est BLOQUANT (commande non transmise) : en cas d'échec → log + alerte à `ADMIN_ALERT_EMAIL` + statut resté `PAID` pour repérage/rejeu manuel.

## Délivrabilité
- Domaine dédié vérifié dans Resend : SPF + DKIM + DMARC (`p=quarantine` minimum). Jamais d'envoi depuis une adresse gratuite.
- `reply-to` surveillé : `contact@{domaine}`.

## Pièges
- Deux envois distincts, jamais de CC : le client ne voit pas l'adresse APF, APF ne voit pas les échanges client.
- Tester chaque gabarit avec des données réelles anonymisées avant lancement (24) : rendu, pièces jointes, aucun terme APF côté client.
