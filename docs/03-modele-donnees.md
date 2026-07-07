# 03 — Modèle de données (PostgreSQL / Supabase)

Objectif : schéma V1 minimal, intègre, sécurisé par RLS.

## Principes
- Prix en CENTIMES (`integer`), jamais de float pour l'argent ; montants HT stockés, TVA calculée.
- `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`.
- Enums PostgreSQL pour les statuts (pas de varchar libres).
- Snapshot des prix dans `order_items` : une commande passée ne change JAMAIS si le catalogue évolue.

## Tables
- `profiles` (1-1 avec `auth.users`, PK = FK `id`) : `email`, `role` enum (`USER`,`PRO_PENDING`,`PRO_VERIFIED`), `siret text null`, `company_name text null`, `created_at`.
- `products` : `id`, `sku` (référence APF, unique), `name`, `slug` (unique, SEO — 18), `category` enum (`MEMBRANE`,`FEUTRE`,`COLLE`,`PVC_LIQUIDE`,`PROFIL`,`SOLVANT`,`AUTRE`), `description`, `image_url`, `base_price_ht`, `pro_price_ht`, `vat_rate` (2000 = 20 %), `weight_grams`, `roll_area_m2 numeric null` (41.25 pour les membranes), `coverage jsonb null` (rendements pour le calculateur, 04/08), `in_stock boolean`, `is_active boolean`.
- `orders` : `id`, `user_id uuid null` (FK profiles — null pour commande invitée), `customer_email`, `stripe_session_id unique`, `total_amount_ht`, `total_vat`, `shipping_fee`, `status` enum (`PAID`,`SENT_TO_SUPPLIER`,`SHIPPED`,`CANCELLED`), `shipping_address jsonb`, `delivery_note_url`, `invoice_number`, `created_at`.
- `order_items` : `id`, `order_id FK`, `product_id FK`, `quantity`, `unit_price_ht` (snapshot), `discount_bps` (remise pack, 13).

## RLS (obligatoire sur toutes les tables)
- `profiles` : lecture/écriture limitée à `auth.uid() = id` ; colonne `role` modifiable uniquement via service_role.
- `products` : lecture publique (`is_active = true`), écriture service_role uniquement.
- `orders`/`order_items` : lecture par le propriétaire ; INSERT/UPDATE uniquement via service_role (webhook serveur).

## Index
- `products(slug)`, `products(category, is_active)`, `orders(user_id, created_at desc)`, `orders(stripe_session_id)`.
- Séquence DB dédiée pour `invoice_number` (numérotation continue légale, voir 11).

## Pièges
- Ne jamais faire confiance au rôle envoyé par le client : le prix facturé dérive du `role` lu en DB côté serveur (14).
- `pro_price_ht` ne doit JAMAIS apparaître dans une réponse publique (filtrage de colonnes selon le rôle).
- Pas de suppression physique d'un produit référencé par des commandes → `is_active = false`.
