# Journal des décisions techniques

Mémoire des choix structurants du projet. À tenir à jour à CHAQUE décision prise, modifiée ou annulée.

## Format
### AAAA-MM-JJ — Titre court
- **Décision** : ce qui est décidé.
- **Motif** : pourquoi (contraintes, alternatives écartées).
- **Impact** : specs/fichiers concernés.

---

### 2026-07-07 — Back-end intégré à Next.js (pas de serveur séparé)
- **Décision** : Route Handlers Next.js sur Vercel ; pas d'Express/NestJS ni de Railway/Render en V1. Mono-repo.
- **Motif** : besoins serveur limités (webhook, PDF, emails), un seul déploiement, coût nul, équipe d'une personne. Extraction possible plus tard (flux APF automatisé, crons).
- **Impact** : 15-api, 25-deploiement.

### 2026-07-07 — Supabase (PostgreSQL + Auth + Storage)
- **Décision** : Supabase retenu contre Neon/Railway ; Supabase Auth (pas d'auth custom) ; Storage à la place de S3 ; Studio = back-office V1.
- **Motif** : Auth + RLS + Storage intégrés, région UE, gain de temps majeur pour un dev solo.
- **Impact** : 03, 14, 16, 23.

### 2026-07-07 — Génération PDF : pdfkit (pas Puppeteer)
- **Décision** : BL et factures générés avec pdfkit.
- **Motif** : Puppeteer trop lourd pour les fonctions serverless Vercel.
- **Impact** : 11, 15.

### 2026-07-07 — Emails : Resend + react-email
- **Décision** : Resend pour tout le transactionnel.
- **Motif** : simplicité, coût, DX ; volume V1 faible.
- **Impact** : 17.

### 2026-07-07 — Flux Git : GitLab (source) → mirror GitHub → Vercel
- **Décision** : push sur GitLab uniquement ; GitHub en miroir ; Vercel branché sur GitHub.
- **Motif** : flux souhaité par le porteur de projet ; conséquences (délai de mirroring, interdiction de push GitHub) documentées en 25.
- **Impact** : 02, 25.

### 2026-07-07 — SEO : pas d'AggregateRating en V1
- **Décision** : JSON-LD Product/Offer sans avis ; AggregateRating réactivé uniquement avec de vrais avis clients (post-V1).
- **Motif** : baliser des notes inexistantes viole les guidelines Google (risque d'action manuelle).
- **Impact** : 18.

### 2026-07-07 — Analytics cookieless dès la V1, pas de GA4
- **Décision** : Plausible (ou Umami) sans cookies ; gestionnaire de consentement dormant, prêt pour la pub future.
- **Motif** : mesure dès le jour 1 sans bannière obligatoire ; pub prévue mais pas au lancement.
- **Impact** : 21, 22.

### EN ATTENTE — Frais de port : option A (inclus, « livraison offerte ») vs option B (forfait ~40 €)
- **Décision** : non tranchée. Implémentation derrière `getShippingFee()` + env `SHIPPING_MODE` pour basculer sans refonte.
- **Impact** : 09, 10, 12, 26.

### EN ATTENTE — Corse : incluse ou exclue de la zone de livraison
- **Décision** : à valider avec APF (surcoût transporteur probable sur rouleaux longs).
- **Impact** : 12, 22.
