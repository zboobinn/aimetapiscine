# 11 — Commandes, BL blind shipping et factures

Objectif : chaîne 100 % automatique après paiement, sans aucune fuite APF côté client.

## Cycle de vie
- `PAID` (créée par le webhook) → `SENT_TO_SUPPLIER` (email APF parti) → `SHIPPED` (mise à jour MANUELLE V1 via Supabase Studio à l'info APF) ; `CANCELLED` en cas d'incident.
- Chaque transition est tracée (`updated_at` ; `status_history jsonb` optionnel).

## Bon de livraison (PDF, pdfkit)
- En-tête : logo + coordonnées de NOTRE société uniquement. AUCUNE mention APF nulle part.
- Mention obligatoire, bien visible : « BLIND SHIPPING — Ne joindre aucune facture APF au colis ».
- Contenu : n° de commande, date, adresse de livraison, lignes (SKU, désignation, quantité) — PAS de prix (le colis arrive chez le client final).
- Stockage : bucket privé Supabase Storage `delivery-notes/` ; URL signée pour l'email APF ; `delivery_note_url` en DB.
- Nota : le SKU APF sur le BL est nécessaire à la préparation chez APF — c'est une référence produit, pas une « mention APF » à masquer.

## Facture client (PDF)
- Émise par NOTRE société : numérotation séquentielle continue et sans trou (obligation légale FR) via séquence DB (03), date, SIREN/TVA intracom, lignes HT, TVA 20 %, TTC, remises visibles.
- Jointe à l'email de confirmation (17) et téléchargeable dans `/compte` (bucket privé `invoices/`, URL signée).

## Espace client
- `/compte` : commandes, statut lisible (« En préparation chez notre partenaire logistique »), factures.

## Pièges
- La numérotation de facture vient d'une séquence DB, jamais d'un compteur applicatif (concurrence = trous ou doublons).
- Société pas encore immatriculée : SIREN/TVA des gabarits paramétrés via env (26), à remplir avant lancement — bloquant légal.
