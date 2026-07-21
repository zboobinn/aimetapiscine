-- Variantes produit (coloris × largeur × conditionnement) — 03/04/08/29. Le
-- catalogue façade (data/apf/catalog-facade.json) a des produits à plusieurs
-- variantes, chacune avec SON PROPRE ref_apf et SON PROPRE prix
-- (mapping-familles.md : "Le ref_apf est porté par la VARIANTE, pas par le
-- produit"). Le modèle mono-niveau actuel (base_price_ht/roll_area_m2/
-- coverage/weight_grams/in_stock sur `products`) ne peut pas représenter ça :
-- ces colonnes descendent toutes au niveau variante dans cette migration.
--
-- ATTENTION (impact applicatif) : cette migration DROP des colonnes encore
-- lues/écrites par le pipeline `data/catalog.json` actuel
-- (`scripts/import-catalog.ts`, `src/lib/catalog/product-row.ts`,
-- `src/lib/catalog/live-pricing.ts`). Après application, ce pipeline ne
-- compile/fonctionne plus tel quel — attendu, il doit être remplacé par le
-- script de seed façade APF (étape 4), pas conservé en parallèle.

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,

  -- SERVER-ONLY (01/27) : référence fournisseur réelle (ex. "D40313VC-N").
  -- Ce n'est PAS `products.sku` (identifiant maison, exposable) — voir RLS
  -- ci-dessous, même traitement que `pro_price_ht` (privilège par colonne,
  -- la policy RLS ne filtre que les LIGNES, jamais les colonnes).
  ref_apf text not null unique,

  coloris text null,
  largeur_m numeric null,
  longueur_rouleau_m numeric null,
  -- Libellé d'affichage pour distinguer deux variantes quand coloris/largeur
  -- ne suffisent pas (ex. conditionnement : "Tube 125 ml" vs "Pot 1 L" sur
  -- colle-bostik-1220 ; 3 variantes de "colle-aerosol" sans coloris/largeur
  -- distinctifs dans le catalogue façade actuel). Nullable : la plupart des
  -- variantes membrane se distinguent déjà par `coloris` seul.
  libelle text null,

  -- Dérivé, jamais recalculé côté appli (même principe que `PriceBlock`,
  -- D6/28b : zéro recalcul dupliqué ailleurs) ; reste null pour tout ce qui
  -- n'est pas un rouleau (accessoires au ml/à la pièce sans largeur ni
  -- longueur de rouleau).
  roll_area_m2 numeric generated always as (largeur_m * longueur_rouleau_m) stored,

  base_price_ht integer not null,
  -- null : pas de prix pro spécifique — le pourcentage global de
  -- `store_settings` s'applique alors sur `base_price_ht` (même convention
  -- que l'actuel `products.pro_price_ht`, 13/14).
  pro_price_ht integer null,

  weight_grams integer not null,
  -- Rendement calculateur (08) : peut varier par conditionnement (un pot de
  -- 5 L ne couvre pas la même surface qu'un pot de 1 L) — descend donc ici
  -- avec le prix plutôt que de rester au niveau produit.
  coverage jsonb null,

  -- Annexe brief photo / spec 29 : une phrase par COLORIS, pas par produit
  -- (une membrane "grand relief" a 5 coloris, donc 5 textes distincts). Ne
  -- vit délibérément PAS dans `coverage` (jsonb à vocation numérique,
  -- rendements calculateur, 08) : un texte libre n'a rien à faire dans un
  -- champ typé pour des nombres, et casserait le contrat déjà consommé par
  -- le calculateur.
  water_appearance text null,

  in_stock boolean not null default true,
  -- Une variante précise (ex. un coloris) peut être retirée sans retirer
  -- tout le produit — distinct de `products.is_active` (retrait total, 03).
  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_product_id_is_active_idx
  on public.product_variants (product_id, is_active);

-- ============================================================
-- RLS — même schéma que `products` (03) : la policy filtre les LIGNES
-- (variante active ET produit parent publié/actif), le privilège par colonne
-- protège `ref_apf`/`pro_price_ht` (RLS ne peut pas exprimer une restriction
-- par colonne, 20260713000000).
-- ============================================================

alter table public.product_variants enable row level security;

create policy "product_variants_select_public"
  on public.product_variants for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.products p
      where p.id = product_variants.product_id
        and p.is_active = true
        and p.statut = 'publie'
    )
  );

create policy "product_variants_service_role_all"
  on public.product_variants for all
  to service_role
  using (true)
  with check (true);

revoke select on public.product_variants from anon, authenticated;

grant select (
  id,
  product_id,
  coloris,
  largeur_m,
  longueur_rouleau_m,
  libelle,
  roll_area_m2,
  base_price_ht,
  weight_grams,
  coverage,
  water_appearance,
  in_stock,
  is_active,
  created_at
) on public.product_variants to anon, authenticated;

-- `ref_apf` et `pro_price_ht` délibérément absents de la liste ci-dessus :
-- lecture réservée à service_role, même traitement que
-- `products.pro_price_ht` (20260713000000). `ref_apf` alimente le BL
-- fournisseur (11) — devra être lu depuis `order_items` → variante (FK à
-- ajouter, voir note de migration ci-dessous), jamais depuis un payload
-- client.

-- ============================================================
-- Colonnes retirées de `products` : descendent au niveau variante (prix,
-- poids, rendement, stock) — voir table ci-dessus.
-- ============================================================

alter table public.products
  drop column base_price_ht,
  drop column pro_price_ht,
  drop column roll_area_m2,
  drop column coverage,
  drop column weight_grams,
  drop column in_stock;

-- ============================================================
-- NON TRAITÉ ICI, à trancher par Léo avant le seed (voir rapport) :
-- `order_items.product_id` référence encore `products(id)`. Le prix ET le
-- ref_apf étant désormais portés par la variante, une commande ne peut plus
-- identifier PRÉCISÉMENT quel coloris/largeur/conditionnement a été acheté à
-- partir de `products(id)` seul. Une migration de suivi
-- (`order_items.variant_id references product_variants(id)`) sera
-- nécessaire, avec les changements applicatifs correspondants (webhook,
-- génération BL/facture, `/api/checkout`) — hors périmètre de ce chantier
-- (schéma `products` uniquement, avant seed).
