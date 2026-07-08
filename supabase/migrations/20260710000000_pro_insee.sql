-- Vérification pro (14) : trace du résultat de l'appel INSEE Sirene sur le
-- profil, à titre indicatif pour le contrôle manuel PRO_PENDING -> PRO_VERIFIED
-- (jamais une bascule automatique — voir docs/14-auth.md et decisions.md).

create type public.insee_verification_status as enum (
  'not_configured', -- identifiants INSEE absents (26) : appel jamais tenté
  'verified',        -- SIRET trouvé, établissement actif
  'not_found',       -- SIRET inconnu de l'annuaire Sirene
  'inactive',        -- SIRET connu mais établissement fermé
  'error'            -- appel API échoué (réseau, quota...) : à revérifier manuellement
);

alter table public.profiles
  add column insee_status public.insee_verification_status null,
  add column insee_verified_at timestamptz null;

-- Comme `role` (03/14), ces colonnes ne reflètent qu'un résultat automatique
-- consultatif : seul service_role peut les écrire (Server Action pro, via le
-- même appel que la mise à jour de `role`/`siret`/`company_name`).
