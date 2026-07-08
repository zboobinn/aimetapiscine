-- Visibilité des commandes bloquées après paiement (11) : si la génération
-- des documents (BL/facture) échoue APRÈS l'encaissement, le paiement ne
-- doit jamais être perdu — la commande reste en `PAID` (spec 11) mais ce
-- champ rend l'échec repérable d'un coup d'œil dans Supabase Studio.

alter table public.orders
  add column processing_error text null;

comment on column public.orders.processing_error is
  'Dernière erreur de génération des documents de commande (BL/facture, 11). '
  'NULL = jamais tenté ou dernière tentative réussie. Filtrer '
  '`status = ''PAID'' and processing_error is not null` pour repérer les '
  'commandes payées mais bloquées, à rejouer (stripe events resend).';
