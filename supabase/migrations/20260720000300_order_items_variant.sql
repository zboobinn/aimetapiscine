-- Migration de suivi de product_variants (20260720000200) : `order_items`
-- doit référencer la VARIANTE achetée, pas seulement le produit. Prix et
-- ref_apf vivent désormais au niveau variante — `product_id` seul ne permet
-- plus de savoir quel coloris/largeur/conditionnement a été commandé, ni de
-- retrouver le `ref_apf` nécessaire au BL fournisseur (11).
--
-- ============================================================
-- Lignes EXISTANTES
-- ============================================================
-- Les `order_items`/`orders` déjà en base proviennent des campagnes de test
-- Stripe (mode TEST) sur les 8 produits de data/catalog.json — aucune
-- `product_variants` correspondante n'existe (le seed façade APF, étape 4,
-- n'a pas encore tourné). Ce sont des commandes de test sans valeur métier :
-- vidées plutôt que forcées derrière un `variant_id` nullable, qui resterait
-- un cas fantôme permanent dans le code (aucune commande future n'aura
-- jamais de `variant_id` null une fois le seed fait — nullable "au cas où"
-- irait à l'encontre du principe du projet de ne pas coder pour un cas qui
-- ne peut plus se produire).
--
-- Garde-fou : si une commande dont le `stripe_session_id` ne ressemble pas à
-- une session de TEST (`cs_test_...`) existe déjà, la migration échoue au
-- lieu de vider silencieusement des données réelles — à adapter (stratégie
-- de backfill) avant réexécution dans ce cas.
do $$
declare
  live_order_count integer;
begin
  select count(*) into live_order_count
  from public.orders
  where stripe_session_id not like 'cs\_test\_%' escape '\';

  if live_order_count > 0 then
    raise exception
      'order_items_variant : % commande(s) non-test détectée(s) (stripe_session_id ne commence pas par cs_test_) — TRUNCATE annulé, cette migration doit être adaptée (backfill réel) avant application.',
      live_order_count;
  end if;
end $$;

truncate table public.orders, public.order_items;

-- ============================================================
-- product_id → variant_id
-- ============================================================
-- `product_id` RETIRÉ plutôt que conservé en dénormalisation. Le retrouver
-- ne coûte qu'une jointure supplémentaire (PostgREST embarque les relations
-- imbriquées en une seule requête — déjà le pattern utilisé par
-- `loadDocumentLines()`, src/app/api/webhooks/stripe/route.ts, qui fait
-- aujourd'hui `order_items.select("...", "products(sku, name, vat_rate)")`
-- et deviendra `product_variants(..., products(name, vat_rate))`) alors
-- qu'une colonne dupliquée introduirait un risque de dérive (`product_id` qui
-- ne correspondrait plus au produit réel de la variante) sans bénéfice
-- mesuré : rien dans le code actuel ne consomme `order_items.product_id`
-- sans passer par le produit qu'il désigne. Une seule source de vérité :
-- `variant_id`.
alter table public.order_items
  drop column product_id,
  add column variant_id uuid not null references public.product_variants (id) on delete restrict;

create index order_items_variant_id_idx on public.order_items (variant_id);

-- ============================================================
-- RLS — rien à changer
-- ============================================================
-- `order_items_select_own` (03) filtre déjà par ligne (propriétaire de la
-- commande parente), sans restriction par colonne : `variant_id` y est donc
-- lisible par le propriétaire exactement comme `product_id` l'était, aucun
-- changement de policy nécessaire.
--
-- Le risque signalé (une jointure `order_items → product_variants` qui
-- ferait fuiter `ref_apf` à un client authentifié consultant son historique
-- de commandes) est déjà couvert par le privilège colonne posé en
-- 20260720000200 : `ref_apf`/`pro_price_ht` sont exclus du GRANT SELECT
-- accordé à `anon`/`authenticated` sur `product_variants`, et cette
-- restriction s'applique à TOUTE lecture de la table sous ce rôle — y
-- compris via un embed PostgREST imbriqué depuis `order_items`. Un client
-- authentifié qui demande `order_items.select("*, product_variants(*)")`
-- reçoit une erreur de privilège sur `ref_apf`/`pro_price_ht`, jamais la
-- valeur. Seul `service_role` (webhook, génération BL) peut la lire.
