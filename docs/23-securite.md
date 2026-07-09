# 23 — Sécurité

Objectif : surface d'attaque minimale ; les deux actifs à protéger : l'argent et les données clients.

## Frontières critiques
- **Webhook Stripe** : signature vérifiée sur le body BRUT, secret dédié par environnement, idempotence par `stripe_session_id` (10). Événement non signé → 400.
- **Montants** : le serveur recalcule TOUT (prix, remises, port) depuis la DB ; toute valeur monétaire venant du client est décorative (09, 10, 13).
- **Rôles** : `role` lu en DB côté serveur ; `pro_price_ht` filtré de toute réponse non autorisée (03, 14).

## Supabase
- RLS activée sur TOUTES les tables, testée dans les 3 contextes : anonyme, user, service_role (24).
- Clé `service_role` : serveur uniquement, jamais dans un composant, jamais préfixée `NEXT_PUBLIC_`.
- Buckets Storage privés ; URL signées à durée courte (16).

## Application
- Zod en entrée de chaque Route Handler ; erreurs sans détail interne (ni stack ni SQL).
- Headers (next.config) : HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` sur nos pages, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive. CSP posée en `Content-Security-Policy-Report-Only` UNIQUEMENT (23b) — jamais bloquante en V1 (Next.js injecte des scripts inline, une CSP stricte casserait le site en silence) ; passage en mode bloquant reste un travail futur, à faire progressivement. `frame-src` ne cite AUCUN domaine simulateur APF : ce serait une fuite blind shipping dans un header HTTP public (01) — spec 16 de toute façon reportée sine die.
- Rate limiting sur `/api/checkout` (23b) : compteur en base Postgres (table `rate_limits`, incrément atomique via fonction `SECURITY DEFINER`), jamais en mémoire (aucun état ne survit entre invocations serverless sur Vercel) ni via une dépendance externe (Upstash refusé, aucune dépendance externe acceptée en V1). `/api/pro/register` n'existe pas — l'inscription pro est une Server Action (`submitProSignupAction`, spec 14/15), non concernée par le rate limiting HTTP.
- `pnpm audit` avant chaque déploiement ; lockfile commité.

## Données personnelles
- Pas d'email/adresse en clair dans les logs des handlers ; PII limitée au strict nécessaire (22).
- Aucune donnée carte ne transite par nous (Stripe Checkout hébergé) — ne jamais « améliorer » avec un formulaire carte custom.

## Pièges
- Une CSP trop stricte casse Stripe EN SILENCE : rejouer le checkout complet après CHAQUE modification de CSP, y compris en Report-Only (le jour du passage en mode bloquant).
- Clés test/live inversées = paiements réels en dev : nommage explicite des environnements (26) et vérification au démarrage (`lib/env.ts`).
