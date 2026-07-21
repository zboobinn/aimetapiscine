# 03 — Modèle de données (PostgreSQL / Supabase)

Objectif : schéma V1 minimal, intègre, sécurisé par RLS.

## Principes
- Prix en CENTIMES (`integer`), jamais de float pour l'argent ; montants HT stockés, TVA calculée.
- `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`.
- Enums PostgreSQL pour les statuts (pas de varchar libres).
- Snapshot des prix dans `order_items` : une commande passée ne change JAMAIS si le catalogue évolue.

## Tables
- `profiles` (1-1 avec `auth.users`, PK = FK `id`) : `email`, `role` enum (`USER`,`PRO_PENDING`,`PRO_VERIFIED`), `siret text null`, `company_name text null`, `created_at`.
- `products` (niveau GAMME, partagé par toutes ses variantes) : `id`, `sku` (identifiant MAISON, unique, **exposable** — ce n'est PAS une référence fournisseur), `name`, `slug` (unique, SEO — 18), `category` enum (`MEMBRANE`,`FEUTRE`,`COLLE`,`PVC_LIQUIDE`,`PROFIL`,`SOLVANT`,`AUTRE`), `description`, `image_url`, `vat_rate` (2000 = 20 %), `statut` enum (`brouillon`,`publie` — distinct de `is_active`, voir Pièges), `unite` enum (`m2`,`ml`,`unite` — unité de FACTURATION, uniforme sur toutes les variantes d'un produit, 08/13), `is_active boolean`.
- `product_variants` (niveau VARIANTE — coloris × largeur × conditionnement, 04/08/29) : `id`, `product_id FK`, `ref_apf text unique` (référence fournisseur réelle, **SERVER-ONLY**, ce n'est PAS `sku`), `coloris text null`, `largeur_m numeric null`, `longueur_rouleau_m numeric null`, `libelle text null` (distingue deux variantes sans coloris/largeur, ex. conditionnement), `roll_area_m2` (généré, `largeur_m * longueur_rouleau_m`), `base_price_ht`, `pro_price_ht null`, `weight_grams`, `coverage jsonb null` (rendements calculateur, 04/08), `water_appearance text null` (une phrase par coloris, annexe-brief-photo/29), `in_stock boolean`, `is_active boolean` (retrait d'UNE variante, distinct du retrait total du produit), `created_at`.
- `orders` : `id`, `user_id uuid null` (FK profiles — null pour commande invitée), `customer_email`, `stripe_session_id unique`, `total_amount_ht`, `total_vat`, `shipping_fee`, `status` enum (`PAID`,`SENT_TO_SUPPLIER`,`SHIPPED`,`CANCELLED`), `shipping_address jsonb`, `delivery_note_url`, `invoice_number`, `created_at`.
- `order_items` : `id`, `order_id FK`, `variant_id FK product_variants` (le produit parent se retrouve par jointure, jamais dénormalisé — une seule source de vérité), `quantity`, `unit_price_ht` (snapshot), `discount_bps` (remise pack, 13).

## RLS (obligatoire sur toutes les tables)
- `profiles` : lecture/écriture limitée à `auth.uid() = id` ; colonne `role` modifiable uniquement via service_role.
- `products` : lecture publique (`is_active = true AND statut = 'publie'`), écriture service_role uniquement.
- `product_variants` : lecture publique (`is_active = true` ET produit parent `is_active = true AND statut = 'publie'`), écriture service_role uniquement ; `ref_apf`/`pro_price_ht` exclus du privilège SELECT anon/authenticated (même traitement par colonne que `products.pro_price_ht`).
- `orders`/`order_items` : lecture par le propriétaire ; INSERT/UPDATE uniquement via service_role (webhook serveur).

## Index
- `products(slug)`, `products(category, is_active)`, `product_variants(product_id)`, `product_variants(product_id, is_active)`, `orders(user_id, created_at desc)`, `orders(stripe_session_id)`.
- Séquence DB dédiée pour `invoice_number` (numérotation continue légale, voir 11).

## Pièges
- Ne jamais faire confiance au rôle envoyé par le client : le prix facturé dérive du `role` lu en DB côté serveur (14).
- `pro_price_ht`/`ref_apf` ne doivent JAMAIS apparaître dans une réponse publique (filtrage de colonnes selon le rôle, `ref_apf` en plus jamais dans un livrable client — 01/27).
- Pas de suppression physique d'un produit/variante référencé par des commandes → `is_active = false`.
- `statut` (brouillon/publié) ≠ `is_active` (retiré/actif) : un produit peut exister en base à l'état brouillon (seedé, non visible) sans jamais avoir été publié — `is_active = false` signale un retrait après publication, pas un brouillon.
- `products.sku` (maison, exposable) et `product_variants.ref_apf` (fournisseur, server-only) sont deux colonnes distinctes qui ne doivent jamais être confondues ni fusionnées.
