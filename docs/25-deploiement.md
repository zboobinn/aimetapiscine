# 25 — Déploiement (GitLab → GitHub → Vercel)

Objectif : flux fiable malgré le mirroring, environnements étanches.

## Flux Git
- Source de vérité : **GitLab** (tous les push). Push mirroring GitLab → GitHub (inclure les branches de feature si l'on veut des Preview Deployments).
- **Vercel** connecté à GitHub : `main` → production ; autres branches → Preview.
- À connaître : délai de mirroring (jusqu'à ~5 min, déclenchable manuellement dans GitLab) ; les statuts de déploiement Vercel s'affichent sur GitHub, pas sur GitLab.

## Branches
- `main` protégée = prod. Branches `feat/…`, `fix/…` mergées via MR GitLab, pipeline bloquant (`build`, `typecheck`, `test`).
- INTERDIRE tout push direct sur GitHub : le repo miroir est en lecture seule fonctionnelle — un commit poussé là serait écrasé ou entrerait en conflit au prochain mirroring.

## Environnements
- **Production** : projet Supabase prod (région UE), clés Stripe LIVE, domaine Resend prod.
- **Preview/dev** : projet Supabase de dev (ou `supabase start` local), clés Stripe TEST. Variables par environnement dans Vercel (26) — JAMAIS de clé live en preview.
- Webhook Stripe : un endpoint par environnement (prod : domaine final ; dev : `stripe listen`). Ne jamais pointer un webhook live vers une preview.

## Mise en production
- Domaine + HTTPS via Vercel ; redirection apex/www vers l'unique forme canonique (18).
- Après chaque `catalog:import` en prod : appeler `/api/revalidate` (04, 15).

## Pièges
- Hotfix urgent : TOUJOURS via GitLab, jamais directement sur GitHub, même « pour aller vite ».
- Rollback : Instant Rollback Vercel pour le code ; les migrations DB ne se rollbackent pas → migrations toujours rétrocompatibles (additives d'abord, suppression en deux temps).
