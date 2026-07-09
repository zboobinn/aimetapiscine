-- Rate limiting Postgres (23b) : pas d'état en mémoire (serverless Vercel,
-- aucune instance ne survit entre invocations) ni de dépendance externe
-- (Upstash refusé, 23-securite.md). Incrément atomique via une fonction
-- SECURITY DEFINER appelée en service_role — un SELECT puis un UPDATE côté
-- application laisserait passer deux requêtes concurrentes sous la limite.

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 1
);

-- Table invisible hors service_role : RLS activée, AUCUNE policy anon/authenticated.
alter table public.rate_limits enable row level security;

-- Fenêtre glissante simple : chaque clé porte un compteur et le début de sa
-- fenêtre courante. Tant que `now()` reste dans la fenêtre, on incrémente ;
-- une fois la fenêtre expirée, on la réinitialise (compteur à 1, nouveau
-- départ). L'upsert `on conflict ... do update` verrouille la ligne le temps
-- de la transaction : deux appels concurrents sur la même clé sont donc
-- sérialisés par Postgres, jamais un SELECT-puis-UPDATE applicatif.
create function public.rate_limit_hit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  -- Nettoyage opportuniste des lignes expirées : tenté à ~1 requête sur 100
  -- plutôt qu'à chaque appel (coût négligeable, pas de job périodique à
  -- opérer en V1 solo — alternative documentée en decisions.md si le volume
  -- justifie un cron dédié plus tard). Marge de 10 fenêtres avant suppression
  -- pour ne jamais purger une clé encore potentiellement consultée.
  if random() < 0.01 then
    delete from public.rate_limits
    where window_start < v_now - make_interval(secs => p_window_seconds * 10);
  end if;

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set
      window_start = case
        when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then v_now
        else rl.window_start
      end,
      count = case
        when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then 1
        else rl.count + 1
      end
  returning window_start, count into v_window_start, v_count;

  if v_count > p_max then
    return query select
      false,
      greatest(
        1,
        ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))
      )::integer;
  else
    return query select true, 0;
  end if;
end;
$$;

-- Exécutée par le client service_role (checkout, 23) — jamais par anon/authenticated.
revoke all on function public.rate_limit_hit(text, integer, integer) from public;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
