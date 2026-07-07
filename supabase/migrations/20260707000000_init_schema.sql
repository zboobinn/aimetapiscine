-- Schéma initial : profiles, products, orders, order_items
-- Enums, index, séquence facture, RLS, trigger de création de profile.

-- ============================================================
-- Enums
-- ============================================================

create type public.user_role as enum ('USER', 'PRO_PENDING', 'PRO_VERIFIED');

create type public.product_category as enum (
  'MEMBRANE',
  'FEUTRE',
  'COLLE',
  'PVC_LIQUIDE',
  'PROFIL',
  'SOLVANT',
  'AUTRE'
);

create type public.order_status as enum ('PAID', 'SENT_TO_SUPPLIER', 'SHIPPED', 'CANCELLED');

-- ============================================================
-- Séquence facture (numérotation continue et sans trou — 11)
-- ============================================================

create sequence public.invoice_number_seq as bigint start with 1 increment by 1;

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'USER',
  siret text null,
  company_name text null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  category public.product_category not null,
  description text null,
  image_url text null,
  base_price_ht integer not null,
  pro_price_ht integer not null,
  vat_rate integer not null default 2000,
  weight_grams integer not null,
  roll_area_m2 numeric null,
  coverage jsonb null,
  in_stock boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles (id) on delete set null,
  customer_email text not null,
  stripe_session_id text not null unique,
  total_amount_ht integer not null,
  total_vat integer not null,
  shipping_fee integer not null,
  status public.order_status not null default 'PAID',
  shipping_address jsonb not null,
  delivery_note_url text null,
  invoice_number bigint null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null,
  unit_price_ht integer not null,
  discount_bps integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Index
-- ============================================================

create index products_slug_idx on public.products (slug);
create index products_category_is_active_idx on public.products (category, is_active);
create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_stripe_session_id_idx on public.orders (stripe_session_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- ============================================================
-- Trigger : création automatique du profile à l'inscription
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles : lecture/écriture limitées au propriétaire.
-- RLS ne restreint pas au niveau colonne : `role` est donc protégé par
-- privilège SQL (REVOKE/GRANT), pas seulement par la policy USING/CHECK.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_service_role_all"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- `role` non modifiable par l'utilisateur, même via son propre profil.
revoke update on public.profiles from authenticated;
grant update (siret, company_name) on public.profiles to authenticated;

-- products : lecture publique des produits actifs, écriture service_role uniquement.
create policy "products_select_active"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

create policy "products_service_role_all"
  on public.products for all
  to service_role
  using (true)
  with check (true);

-- orders : lecture par le propriétaire, écriture service_role uniquement (webhook).
create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "orders_service_role_all"
  on public.orders for all
  to service_role
  using (true)
  with check (true);

-- order_items : lecture par le propriétaire de la commande parente, écriture service_role uniquement.
create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "order_items_service_role_all"
  on public.order_items for all
  to service_role
  using (true)
  with check (true);
