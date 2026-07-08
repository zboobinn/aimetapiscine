-- Documents de commande (11) : BL blind shipping + facture client.
-- Colonnes de suivi, traçabilité des transitions de statut, séquence
-- facture exposée en RPC, buckets Storage privés.

-- ============================================================
-- Colonnes orders
-- ============================================================

alter table public.orders
  add column invoice_pdf_path text null,
  add column status_history jsonb not null default '[]'::jsonb,
  add column updated_at timestamptz not null default now();

-- `delivery_note_url` (schéma initial, 03) stocke en réalité le CHEMIN de
-- l'objet dans le bucket privé `delivery-notes/`, pas une URL signée : les
-- URL signées expirent, elles sont donc générées à la demande (email APF en
-- 17, téléchargement `/compte`) à partir de ce chemin, jamais persistées.
comment on column public.orders.delivery_note_url is
  'Chemin de l''objet dans le bucket privé delivery-notes/ (pas une URL signée, 11).';
comment on column public.orders.invoice_pdf_path is
  'Chemin de l''objet dans le bucket privé invoices/ (pas une URL signée, 11).';

-- ============================================================
-- Traçabilité des transitions de statut (11)
-- ============================================================

-- Un seul trigger couvre TOUTES les transitions, qu'elles viennent de
-- l'app (webhook) ou d'une mise à jour manuelle via Supabase Studio
-- (SHIPPED/CANCELLED, V1) : aucune transition ne peut échapper à la trace.
create function public.track_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_history = coalesce(old.status_history, '[]'::jsonb) || jsonb_build_object(
      'from', old.status,
      'to', new.status,
      'at', now()
    );
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_track_status_change
  before update on public.orders
  for each row execute function public.track_order_status_change();

-- ============================================================
-- Numérotation facture (séquence DB, continue et sans trou — 03/11)
-- ============================================================

-- La séquence `invoice_number_seq` (03) n'est pas directement accessible via
-- l'API PostgREST : cette fonction l'expose en RPC pour le webhook
-- (service_role uniquement).
create function public.next_invoice_number()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.invoice_number_seq');
$$;

revoke execute on function public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.next_invoice_number() to service_role;

-- ============================================================
-- Buckets Storage privés (11)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('delivery-notes', 'delivery-notes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Aucune policy `storage.objects` ajoutée : buckets privés, RLS activée par
-- défaut par Supabase (aucun accès anon/authenticated), seul `service_role`
-- (qui contourne RLS) lit/écrit — les URL signées sont émises uniquement
-- côté serveur (webhook, route `/compte`).
