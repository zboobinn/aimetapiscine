# 02 — Setup : environnement et structure du repo

Objectif : démarrer le projet localement en < 30 min et fixer la structure du mono-repo.

## Prérequis
- Node.js ≥ 20 LTS, pnpm, Git.
- CLI : `supabase` (stack locale + migrations), `stripe` (webhooks en local), `vercel` (optionnel).
- Comptes : Supabase (région UE), Stripe (mode test), Resend, Vercel, GitLab + GitHub.

## Initialisation
- `pnpm create next-app` : App Router, TypeScript, Tailwind, ESLint, `src/`.
- Prettier + plugin Tailwind ; TypeScript `strict: true`.
- `supabase init` puis `supabase start` ; migrations SQL versionnées dans `supabase/migrations/`.
- Copier `.env.example` → `.env.local` (voir 26-env-config.md).

## Structure cible
```
src/
  app/            # routes (pages + api/)
  components/     # UI réutilisable
  lib/            # clients (supabase, stripe, resend), env, utils
  features/       # calculateur, panier, checkout (logique métier)
scripts/          # import catalogue (04)
supabase/         # migrations, seed
content/guides/   # MDX éditorial (20)
docs/             # spécifications (ce dossier)
```

## Scripts pnpm attendus
- `dev`, `build`, `lint`, `typecheck`, `test` (Vitest), `test:e2e` (Playwright).
- `db:migrate`, `db:seed`, `catalog:import` (04).
- `stripe:listen` → `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Pièges
- Développer les webhooks avec `stripe listen`, jamais en devinant les payloads.
- Ne jamais commiter `.env*` (sauf `.env.example`) ni la clé service_role.
- Le schéma évolue par migrations SQL versionnées uniquement ; Supabase Studio sert aux DONNÉES (validation pros, statuts), pas au schéma.
