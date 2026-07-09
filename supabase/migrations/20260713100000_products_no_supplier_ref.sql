-- Défense en profondeur (23) : `products.image_url` ne doit jamais pouvoir
-- contenir de référence fournisseur, même si l'application ne le lit
-- actuellement pas en live (voir decisions.md, 2026-07-14 — correctif de
-- constat). `sku` reste la SEULE colonne de `products` autorisée à porter
-- une référence APF (elle alimente le BL, 11). L'ordre compte : le CHECK
-- ci-dessous est validé contre les lignes déjà en base, donc la normalisation
-- doit passer AVANT.

update public.products
set image_url = '/products/' || slug || '.jpg'
where image_url is not null;

alter table public.products
  add constraint products_image_url_no_supplier_ref
  check (image_url is null or image_url not like '%APF-%');
