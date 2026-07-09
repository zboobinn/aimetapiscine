-- Fuite blind shipping/tarifaire (23) : RLS filtre les LIGNES, pas les
-- colonnes. `products_select_active` (20260707000000) autorise déjà
-- anon/authenticated à lire `pro_price_ht` sur toute ligne active — la clé
-- anon étant publique (bundle JS navigateur), n'importe qui peut lire toute
-- la grille tarifaire pro via un appel PostgREST direct, en contournant
-- entièrement `resolvePricingRole()`. Même correctif que `profiles.role`
-- (20260707000000) : REVOKE/GRANT par colonne, pas une nouvelle policy
-- (RLS ne peut pas exprimer une restriction par colonne).

revoke select on public.products from anon, authenticated;

grant select (
  id,
  sku,
  name,
  slug,
  category,
  description,
  image_url,
  base_price_ht,
  vat_rate,
  weight_grams,
  roll_area_m2,
  coverage,
  in_stock,
  is_active,
  created_at
) on public.products to anon, authenticated;

-- `pro_price_ht` volontairement absent de la liste ci-dessus : lecture
-- réservée à service_role (déjà `products_service_role_all`, contourne RLS
-- et les privilèges de colonne). Le prix pro n'est donc plus lisible qu'en
-- service_role, jamais via la clé anon — voir `fetchLiveProPriceHtCents()`
-- dans `src/lib/catalog/live-pricing.ts`.
