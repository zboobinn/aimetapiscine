-- Idempotence des emails transactionnels (17). Deux colonnes distinctes sur
-- `orders` (pas une seule partagée) : la confirmation client et l'ordre
-- d'expédition APF sont deux envois indépendants qui peuvent échouer
-- séparément (webhook Stripe) — il faut pouvoir rejouer l'un sans renvoyer
-- l'autre. `orders.status` ne bascule en `SENT_TO_SUPPLIER` que lorsque
-- `supplier_email_sent_at` est renseigné (le statut ne doit jamais mentir :
-- "envoyé au fournisseur" implique que le fournisseur a réellement reçu le mail).

alter table public.orders
  add column confirmation_email_sent_at timestamptz null,
  add column supplier_email_sent_at timestamptz null;

comment on column public.orders.confirmation_email_sent_at is
  'Horodatage d''envoi de l''email de confirmation client (17). NULL = jamais '
  'envoyé ou dernière tentative en échec (voir processing_error) — ne pas '
  'renvoyer si non-NULL.';

comment on column public.orders.supplier_email_sent_at is
  'Horodatage d''envoi de l''ordre d''expédition à APF (BL joint, 17). NULL = '
  'jamais envoyé ou dernière tentative en échec (voir processing_error) — ne '
  'pas renvoyer si non-NULL. `orders.status` ne passe à SENT_TO_SUPPLIER que '
  'lorsque cette colonne est renseignée.';

-- Idempotence de l'email « compte pro activé » (14/17), écrite uniquement par
-- POST /api/hooks/pro-activated en service_role.
alter table public.profiles
  add column pro_activation_email_sent_at timestamptz null;

comment on column public.profiles.pro_activation_email_sent_at is
  'Horodatage d''envoi de l''email « compte pro activé » (17). NULL = jamais '
  'envoyé — ne pas renvoyer si non-NULL. Écrite uniquement par '
  '/api/hooks/pro-activated (service_role), jamais par l''utilisateur.';
