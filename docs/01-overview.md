# 01 — Overview : contexte métier et périmètre

Objectif : donner à toute session de dev le contexte business minimal pour des décisions cohérentes.

## Modèle
- E-commerce de membranes armées piscine + accessoires de pose, 100 % dropshipping APF Pool Design.
- Blind shipping : APF expédie avec NOS bons de livraison ; aucune facture ni mention APF ne doit atteindre le client (site, PDF, emails).
- Positionnement : premium, minimaliste, expert. Différenciation par le calculateur (08) et le SEO (18), pas par le prix.
- Marges faibles assumées en V1 : priorité aux premières ventes et à l'automatisation totale post-paiement.

## Cibles
- B2C : bricoleurs avertis → réassurance, guidage, packs « prêts à poser », prix TTC.
- B2B : piscinistes → commande rapide, compte vérifié (SIRET), prix HT remisés.
- Zone : France métropolitaine exclusivement (TVA 20 %, pas d'i18n).

## Workflow automatisé (vue d'ensemble)
1. Paiement Stripe validé → webhook (10).
2. Génération du BL PDF blind shipping (11) → Supabase Storage.
3. Email automatique à la logistique APF avec BL joint + email confirmation/facture au client (17).
4. Gestion manuelle V1 via Supabase Studio (statuts, validation pros) et dashboard Stripe — pas de back-office.

## Périmètre V1 / hors V1
- V1 : catalogue, calculateur (rectangles), packs, checkout Stripe, comptes B2C/B2B, blind shipping automatisé, SEO technique, pages légales.
- Hors V1 : back-office admin, avis clients, blog rédigé (structure seule), pub/tracking marketing, formes de bassin complexes, international.

## Pièges connus
- Ne jamais afficher ni logger de référence APF dans un livrable destiné au client.
- Catalogue APF fourni en PDF : import manuel structuré (04), pas de flux automatique — ne pas présumer d'une API fournisseur.
- Statut juridique en cours de création : ne bloque pas le dev, mais mentions légales/facturation (11, 22) paramétrables et finalisées avant lancement.
