-- store_settings : réglages boutique éditables sans redéploiement (26).
-- + products.pro_price_ht devient nullable : un produit sans prix pro
-- spécifique se voit appliquer le pourcentage pro global ci-dessous (14).

alter table public.products
  alter column pro_price_ht drop not null;

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Valeur de départ : 10 % de remise pro globale (14) tant qu'aucun autre
-- réglage n'a été saisi via Supabase Studio ou une future interface admin.
insert into public.store_settings (key, value) values ('pro_discount_bps', '1000'::jsonb);

alter table public.store_settings enable row level security;

-- Lecture réservée aux utilisateurs authentifiés : seul un compte
-- PRO_VERIFIED a besoin de résoudre le pourcentage pro global (14), jamais
-- un visiteur anonyme. Écriture service_role uniquement (03) — la TVA reste
-- une constante métier codée en dur, jamais une ligne de cette table.
create policy "store_settings_select_authenticated"
  on public.store_settings for select
  to authenticated
  using (true);

create policy "store_settings_service_role_all"
  on public.store_settings for all
  to service_role
  using (true)
  with check (true);
