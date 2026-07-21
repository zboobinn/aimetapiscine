-- Unité de vente (invariant financier, 08/13) : un accessoire facturé au ml
-- ou à la pièce a besoin de cette information pour le calculateur et
-- l'affichage prix (ex. "10,40 € / ml" vs "21,00 € / pièce"). Portée au
-- niveau PRODUIT et non variante : vérifié sur
-- data/apf/catalog-facade.json que `unite` ne varie jamais entre les
-- variantes d'un même produit (ex. "bande-soudure" a 2 variantes, les deux en
-- `ml`).
--
-- Distinct du conditionnement physique (rouleau/bidon/barre/cartouche,
-- `catalogEntrySchema.unit` côté pivot data/catalog.json, jamais persisté en
-- DB aujourd'hui) : `unite` ici est l'unité de FACTURATION (m² / ml / pièce),
-- pas le contenant.

create type public.sale_unit as enum ('m2', 'ml', 'unite');

alter table public.products
  add column unite public.sale_unit not null default 'unite';

grant select (unite) on public.products to anon, authenticated;
