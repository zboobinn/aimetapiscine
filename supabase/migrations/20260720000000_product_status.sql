-- Statut de publication (03/29, préparation seed catalogue APF) : `is_active`
-- sert au retrait DÉFINITIF d'un produit (jamais de suppression physique,
-- 03), pas à un brouillon en attente de validation métier. Le catalogue
-- façade (data/apf/catalog-facade.json, mapping-familles.md) compte 9
-- familles Alkorplan marquées ⚠️ flag : à seeder dès maintenant (le script
-- doit pouvoir tout écrire en base) mais gardées invisibles côté client tant
-- qu'APF n'a pas confirmé par écrit l'absence de marquage fabricant physique
-- dans le lé. `statut` porte CETTE distinction, orthogonale à `is_active`.

create type public.product_status as enum ('brouillon', 'publie');

alter table public.products
  add column statut public.product_status not null default 'brouillon';

-- Lecture publique désormais conditionnée aux DEUX : produit non retiré ET
-- publié. Un produit brouillon existe en base mais n'est jamais renvoyé par
-- `products_select_active` tant que `statut != 'publie'`.
drop policy "products_select_active" on public.products;

create policy "products_select_active"
  on public.products for select
  to anon, authenticated
  using (is_active = true and statut = 'publie');

-- `statut` n'est pas sensible (aucune fuite tarifaire/fournisseur) : lisible
-- publiquement comme les colonnes déjà accordées en 20260713000000.
grant select (statut) on public.products to anon, authenticated;
