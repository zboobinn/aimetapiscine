# 22 — Légal, RGPD et consentement (France/UE)

Objectif : conformité e-commerce française complète au lancement ; bannière prête pour la pub future.

## Pages légales obligatoires (07)
- **Mentions légales** : identité de la société (paramétrable via env — 26, à compléter à l'immatriculation), directeur de publication, hébergeur, contact.
- **CGV — deux régimes distincts** :
  - B2C : droit de rétractation 14 jours OBLIGATOIRE sur rouleaux et accessoires standard — l'exception « biens confectionnés sur mesure » NE s'applique PAS à des rouleaux de dimension standard. La politique « pas de retour si la commande est conforme » n'est licite qu'en B2B : ne jamais l'écrire côté consommateur. Prévoir : frais de retour à la charge du client (à indiquer explicitement, sinon ils sont à notre charge), modalités et formulaire type de rétractation.
  - Garanties légales : conformité (2 ans) et vices cachés — mention obligatoire. Erreur fournisseur (ex. gris livré au lieu de bleu) = défaut de conformité : remplacement à NOS frais vis-à-vis du client ; le recours contre APF est notre affaire interne, invisible du client.
  - Médiateur de la consommation : désignation obligatoire AVANT lancement.
- **Politique de confidentialité** : données collectées (compte, commande, SIRET), finalités, durées (commandes/factures : 10 ans comptables), destinataires (Stripe, Resend, Supabase, partenaire logistique pour la livraison), droits RGPD et contact.
- **Livraison & retours** : synthèse lisible (12).

## Consentement
- V1 : uniquement cookies strictement nécessaires (session, panier) + analytics exempté (21) → bannière NON requise ; publier une politique cookies.
- Intégrer néanmoins dès la V1 un gestionnaire de consentement DORMANT (catégories nécessaire / analytics / marketing), activé le jour des premiers tags publicitaires : aucun tag marketing ne se charge avant opt-in explicite.

## Traitements
- Registre des traitements simple (document interne) ; Supabase en région UE ; minimisation des données collectées.

## Pièges
- Le double régime B2C/B2B impose de savoir qui achète : le statut PRO_VERIFIED (14) fait foi pour le régime B2B ; les CGV acceptées au checkout couvrent les deux.
- Aucune case pré-cochée, nulle part (consentement, future newsletter).
- SIRET d'un entrepreneur individuel = donnée personnelle (14).
