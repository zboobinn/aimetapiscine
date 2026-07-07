# 14 — Authentification et comptes (Supabase Auth)

Objectif : comptes B2C simples, parcours pro vérifié (SIRET), prix conditionnels sûrs.

## Socle
- Supabase Auth email/mot de passe + vérification d'email obligatoire. Pas d'OAuth en V1.
- `profiles` (03) créé par trigger sur `auth.users` ; `role` par défaut `USER`.
- Sessions via `@supabase/ssr` (cookies) ; helper `getUser()` serveur pour toute page/route protégée.

## Parcours pro
1. `/compte/pro` : formulaire SIRET (14 chiffres, validation format + clé de Luhn) + raison sociale → `role = PRO_PENDING`.
2. PRO_PENDING voit les prix publics TTC + bandeau « Compte en cours de vérification ».
3. Vérification MANUELLE V1 : contrôle du SIRET sur l'annuaire public INSEE, puis passage à `PRO_VERIFIED` via Supabase Studio.
4. Email de confirmation d'activation (17) — envoi manuel ou trigger simple en V1.

## Affichage conditionnel des prix
- Le rôle est lu EN DB côté serveur à chaque résolution de prix, checkout inclus — jamais depuis un état client.
- `pro_price_ht` absent de TOUTE réponse destinée à un non-PRO_VERIFIED (filtrage colonnes, 03).
- Pages produits statiques : prix public dans le HTML mis en cache ; prix pro hydraté côté client après auth (07). Le cache ne doit JAMAIS contenir de prix pro.

## Pièges
- Après changement de rôle, rafraîchir la session côté client (revalidation) pour éviter un affichage périmé.
- SIRET : donnée d'entreprise, mais si entrepreneur individuel l'adresse associée est une donnée personnelle → traiter comme PII (22).
- Protéger `/compte` et les Route Handlers par vérification serveur systématique (23), le middleware d'UI ne suffit pas.
