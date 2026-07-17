# Spec 30 — Homepage

**Statut :** bloqué sur assets photo
**Dépend de :** 27, 28, 29
**Effort estimé :** 2 sessions

---

## Le travail de cette page

Transformer une **angoisse de dimensionnement** en un **début de désir esthétique**, puis rendre le calcul évident.

Le visiteur type : *« mon liner est fissuré, je ne sais pas quoi commander, j'ai peur de me tromper de 5 cm et de perdre 1200 € »*.
La page répond dans cet ordre : **On sait faire → Voici à quoi ça ressemblera → Voici comment on mesure → Voici le prix.**

Tout le reste est décor, et le décor se coupe.

---

## Les 10 sections, dans l'ordre

| # | Section | Animation | Pourquoi |
|---|---|---|---|
| 01 | **Hero « Le bassin »** — photo plein cadre, swatches horizontaux, 2 CTA | **Aucune.** Crossfade 120 ms au clic swatch, c'est tout. | Élément LCP. 0,1 s de gain de chargement = +8 % de conversion en retail (Google/Deloitte). Toute animation d'entrée coûte du LCP. |
| 02 | **Barre de réassurance** — 4 items texte, sans icônes mignonnes | Aucune | 39 % des abandons = frais annexes. Répondre avant qu'on demande. |
| 03 | **Teaser calculateur — 3 champs** | Aucune sur les champs | Le calculateur est l'actif unique. Le cacher derrière un item de nav, c'est le gaspiller. |
| 04 | **Nuancier** — grille 3 col. / 2 col. mobile | Reveal + stagger 60 ms, 6 items max | Macro matière au repos → bassin rempli au survol. |
| 05 | **Comment ça marche** — 4 étapes numérotées | Aucune | La numérotation encode une vraie séquence temporelle. Elle est légitime ici, et nulle part ailleurs sur le site. |
| 06 | **Preuve — bassins réalisés** | Aucune | Photos clients + note + 1 avis long cité. |
| 07 | **Bento « Pourquoi une membrane armée »** | Reveal | Le seul endroit où le bento est justifié : des faits hétérogènes de même niveau. Une fois. |
| 08 | **Espace pro (SIRET)** | Aucune | Le compte pro existe. Il ne se découvre pas dans le footer. |
| 09 | **FAQ inline** — `<details>`, jamais d'onglets | Aucune | Balisée `schema.org/FAQPage`. |
| 10 | **Footer** | Aucune | Liens « Retours » et « Livraison » en dur. |

---

## Le hero — spécification serrée

C'est le pari du projet. Il mérite d'être écrit noir sur blanc.

- **Aucune animation au-dessus de la ligne de flottaison.** ⚠️ **AMENDÉ le 2026-07-17** — le hero défile désormais automatiquement (3 photos, 6 s, crossfade, pause au survol/focus, aucune rotation sous `prefers-reduced-motion`), cf. `docs/decisions.md` D4 et l'entrée « Redesign, passe D ». Le reste de la phrase ci-dessous décrit l'état d'origine, conservé pour trace. Pas de fade-in du titre, pas de reveal, pas de parallaxe, pas de vidéo. Une image apparaît. Six pastilles de couleur. Deux boutons.
- L'image est en `next/image`, `priority`, `fetchPriority="high"`, AVIF, ~90 KB à 1600px.
- Précharger **les deux premiers coloris seulement**. Pas les six.
- Les swatches changent l'image en crossfade 120 ms. Rien d'autre ne bouge.

> Là où tous les concurrents et toutes les refontes de 2026 posent un reveal, un compteur, un WebGL — le silence visuel est le positionnement. Il a en plus le bon goût d'être le meilleur LCP possible.

Si quelqu'un demande « on ne peut pas juste ajouter un petit fade sur le titre ? » : non. C'est écrit ici.

---

## Le teaser calculateur

**Trois champs. Pas le calculateur complet.**

```
┌──────────────────┐  ┌──────────────────────────────────────────┐
│  ○ Rectangulaire │  │  Longueur   [ 8,00 ] m                   │
│  ○ Ovale         │  │  Largeur    [ 4,00 ] m                   │
│  ○ Haricot       │  │  Profondeur [ 1,50 ] m                   │
│  ○ Sur plan      │  │  → 46,4 m² · à partir de 1 240 € TTC     │
│  [schéma coté]   │  │     [ Continuer sur le calculateur → ]   │
└──────────────────┘  └──────────────────────────────────────────┘
```

- Réutilise le composant calculateur de la spec 29, en mode `variant="teaser"`.
- Chargé en `next/dynamic` avec `ssr: false` — **ici seulement**. Sur le PDP il reste SSR pour le SEO du prix. Sur la homepage il est sous la ligne de flottaison et n'a aucune valeur SEO.
- Produit un prix estimé en **< 100 ms** après la saisie du 3e champ.
- Le clic sur « Continuer » **pré-remplit le calculateur expert et l'ouvre à l'étape 2**. L'utilisateur ne ressaisit rien. C'est un effet d'escalier, pas un formulaire.

---

## SEO machine

- `app/layout.tsx` : JSON-LD `Organization`, via le builder gardé de la spec 27.
- Homepage : JSON-LD `FAQPage` sur la section 09.
- `public/llms.txt` : présentation courte du site, gammes, page calculateur, page contact. Pas de mention fournisseur.
- Chaque PDP : `Product` + `Offer` + `AggregateRating` (dès que la spec 31 alimente les avis).

**[Opinion assumée]** *« Quel liner pour une piscine 8×4 avec escalier roman ? »* est une question qu'on pose à un assistant, pas à un moteur. Le coût est de quelques heures ; l'effet est structurel. C'est le meilleur rapport effort/résultat de tout le backlog.

> 🔒 Le JSON-LD ne doit exposer ni `brand`, ni `manufacturer`, ni `seller` autres que aimetapiscine. Garde de la spec 27.

---

## Critère de done

- [ ] **Aucune animation au-dessus de la ligne de flottaison.** Vérifié à la main, sur mobile, en throttling CPU 4×.
- [ ] LCP < **1,8 s** sur mobile 4G simulé, sur une connexion froide.
- [ ] CLS < 0,05. Aucun saut au chargement des polices (`display: swap` + `next/font` self-hosted).
- [ ] Le teaser calculateur affiche un prix en < 100 ms après le 3e champ (mesuré au Performance panel).
- [ ] « Continuer » ouvre le calculateur expert **pré-rempli**, à l'étape 2. Aucune ressaisie.
- [ ] First-load JS de la route `/` : **< 130 KB gzip**.
- [ ] `llms.txt` servi en 200, sans mention fournisseur.
- [ ] Le JSON-LD `FAQPage` et `Organization` valident au Rich Results Test.
- [ ] Test blind-shipping : aucun token interdit dans le JSON-LD sérialisé de la homepage.
- [ ] Aucun onglet horizontal sur la page. ~~Aucun carrousel auto.~~ ⚠️ **AMENDÉ le 2026-07-17** — le hero a désormais un carrousel auto assumé (cf. `docs/decisions.md` D4). Aucun compteur animé. Aucun badge d'urgence.
- [ ] Dans Firefox stable : la page s'affiche complètement, sans reveal. Aucun contenu manquant.

---

## Ce qui a été retiré du backlog, et pourquoi

| Écarté | Raison |
|---|---|
| Hero vidéo | 2–4 MB, LCP > 3 s |
| Simulateur 3D | ~400 KB de three.js, INP catastrophique sur mobile — et parké sur dépendance externe |
| Scroll smoothing (Lenis / ScrollSmoother) | 15 KB + scrolljacking. NN/g : désorientation majoritaire, pire sur mobile, interprété comme un bug par les utilisateurs orientés tâche. Le tien l'est exclusivement. |
| Kinetic typography | ~4 KB + reflows, pour zéro gain mesuré |
| Dark mode | On vend de la couleur et de la lumière |
| Badges « 8 personnes regardent ce produit » | Absurde sur un achat sur-mesure décennal, et ça se voit |
