-- Correctif spec 17 (constat du 2026-07-09, decisions.md) : cet index est
-- redondant avec la contrainte `unique` sur `orders.stripe_session_id`
-- (`orders_stripe_session_id_key`, 20260707000000_init_schema.sql), qui crée
-- déjà son propre index btree pour l'appliquer. Coût d'écriture inutile sur
-- chaque insertion/update de `orders`.
drop index if exists public.orders_stripe_session_id_idx;
