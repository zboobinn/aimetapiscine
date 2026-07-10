# Spec 31 — Preuve sociale & finition

**Statut :** à faire
**Dépend de :** 27 (helper blind-shipping), 28, 29, 30
**Effort estimé :** 3 sessions

---

## Ordre d'implémentation à l'intérieur de la spec

Les View Transitions arrivent **en dernier**. C'est du polish sans preuve de conversion. Si le temps manque, c'est ce qu'on coupe.

1. Avis clients + modération
2. Devis invité partageable
3. Schéma SVG coté
4. Checklist de pose → pack
5. Reveals CSS
6. View Transitions

---

## 1. Avis clients

### Modèle

Table `reviews` : `id`, `product_id`, `order_id` (achat vérifié), `rating`, `body`, `images[]`, `status` (`pending` | `published` | `rejected`), `brand_reply`, `created_at`.

RLS : lecture publique **uniquement** sur `status = 'published'`. Écriture liée à un `order_id` du client authentifié.

### Modération — a priori, obligatoire

**Aucun avis avec photo n'est publié sans validation humaine.** Ce n'est pas une préférence, c'est le maillon faible du blind-shipping : un client photographie son colis, le carton porte le nom du fournisseur.

Pipeline à l'insertion :
1. `assertBlindSafe()` (spec 27) sur `body` + sur chaque nom de fichier d'image.
2. Toute image passe par `sanitize()` (spec 27) → EXIF supprimé, nom réécrit.
3. `status = 'pending'` systématiquement si `images.length > 0`.
4. Un avis texte seul peut passer en `published` automatiquement **si** `containsForbiddenToken(body) === false`.

Interface d'admin minimale : une page `/admin/reviews`, protégée par re-vérification du rôle côté serveur (jamais depuis le corps de la requête). Trois boutons : publier, rejeter, répondre.

### Affichage

- **Distribution des notes cliquable.** Filtrer par nombre d'étoiles.
- **Photos clients navigables entre avis.** Cliquer une photo ouvre un overlay avec carrousel qui traverse **tous** les avis à photo, pas seulement celui d'origine. **[Mesuré]** 63 % des sites ne le permettent pas ([Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).
- **Réponses de la marque, stylées différemment de l'avis** (fond, filet gauche, libellé « Réponse de aimetapiscine »). **[Mesuré]** 89 % des sites ne répondent jamais aux avis négatifs, alors qu'y répondre est perçu positivement.
- Alimente `AggregateRating` dans le JSON-LD du PDP.

---

## 2. Devis invité partageable

**[Mesuré]** 21 % des utilisateurs s'appuient sur les fonctions « Enregistrer » ; 89 % des sites les réservent aux comptes, ce qui fait fuir ([Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).

Le liner est un **achat de couple**. Quelqu'un calcule, l'autre valide le soir.

- Bouton « Enregistrer ce devis » sur le PDP et dans le panier.
- Sans compte : le panier + les cotes sont sérialisés, POSTés vers `/api/quotes`, qui retourne une URL courte (`/devis/{nanoid}`).
- Expiration 90 jours. Aucune donnée personnelle stockée, pas d'email requis.
- À la connexion, un devis anonyme se rattache au compte.
- L'URL est ouvrable dans un autre navigateur et restaure le panier à l'identique — **c'est le test**.

> 🔒 Le devis rendu ne doit contenir aucune référence fournisseur. Il passe par la fonction unique de calcul de prix, comme le PDF de facture.

---

## 3. Schéma SVG coté

Pendant que l'utilisateur remplit le calculateur, un SVG de sa piscine se met à jour avec ses cotes.

- **Pas de 3D.** Un plan coté, comme un plan d'architecte. C'est le langage de confiance de ce métier.
- ~2 KB de SVG inline, généré côté client à partir des mêmes valeurs que le calcul.
- Animation : les cotes se dessinent en `stroke-dasharray`, 250 ms. C'est le seul mouvement du sous-registre « Bureau d'études ».
- Sous `prefers-reduced-motion: reduce` : le trait apparaît d'un coup.
- `role="img"` + `<title>` + `<desc>` décrivant les cotes en texte. Le schéma doit être lisible par un lecteur d'écran.

---

## 4. Checklist de pose → pack

En bas du PDP, jamais dans la buy-box.

> **Pour poser ce liner, il vous faudra aussi :**
> ☐ Colle PVC — 24,90 € *(non inclus)*
> ☐ Profilé de finition — 39,00 € *(non inclus)*
> ☐ Sac de lestage — 12,50 € *(non inclus)*

- Chaque item porte explicitement **« non inclus »**. **[Mesuré]** 44 % des sites ne clarifient pas inclus / en supplément — source d'appels SAV massive.
- Cocher ≥ 2 items déclenche le pack correspondant du système de remises existant.
- **La remise est le seul argument affiché.** Pas d'urgence, pas de « offre limitée ».
- Aucune case pré-cochée. Jamais.

---

## 5. Reveals CSS

Application des primitives de la spec 28 : `.reveal` sur les sections 04, 07 de la homepage et sur les highlights du PDP.

- Stagger 60 ms, **6 items maximum**. Au-delà, ça devient une attente.
- Sous `@supports (animation-timeline: view())` + `prefers-reduced-motion: no-preference`.
- Coût : **0 KB de JavaScript**.

---

## 6. View Transitions — catalogue → produit, et rien d'autre

Le dernier item du backlog. Impact conversion : aucune preuve. Impact perception : réel.

### Le piège documenté

L'App Router **streame** le HTML. Si `router.push()` vise une route dont un Server Component est lent, le navigateur capture l'ancien snapshot puis reste figé le temps du round-trip RSC. [C'est pire que pas de transition du tout.](https://www.72technologies.com/blog/view-transitions-nextjs-app-router-guide)

### La mise en œuvre

- `experimental: { viewTransition: true }` dans `next.config.js` ([doc Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)). Rappel : le composant `<ViewTransition>` de React est encore expérimental, l'App Router tourne sur des releases canary.
- **Un seul `view-transition-name`** : l'image produit. Pas de transition globale sur toutes les navigations.
- `router.prefetch(href)` sur `onMouseEnter` de chaque carte produit.
- `loading.tsx` de la route produit avec une géométrie **identique** à la page finale (même hauteur d'image, même largeur de buy-box). Sinon le morph saute.
- Durée 200–400 ms. Au-delà de 500 ms, le site paraît lent.
- **Zéro dépendance.** Ni `next-view-transitions`, ni autre.
- Sans support navigateur : la navigation est instantanée, l'app fonctionne. C'est de l'amélioration progressive au sens strict.

---

## Critère de done

- [ ] Un avis **avec photo** ne s'affiche jamais publiquement avant validation dans `/admin/reviews`.
- [ ] Un avis texte contenant un token interdit (6 variantes de casse et de ponctuation) est bloqué à l'insertion, code d'erreur standardisé.
- [ ] Une photo d'avis chargée avec un EXIF piégé ressort sans aucune métadonnée. *(test 1 de la spec 27, rejoué sur ce chemin)*
- [ ] Le carrousel de photos clients traverse **tous** les avis à photo, dans les deux sens, au clavier et au swipe.
- [ ] Une réponse de la marque est visuellement distincte de l'avis, et annoncée comme telle par un lecteur d'écran.
- [ ] `/devis/{id}` ouvert dans un **autre navigateur**, non connecté, restaure le panier et les cotes à l'identique.
- [ ] Le schéma SVG expose ses cotes en texte via `<title>` / `<desc>`.
- [ ] Cocher 2 items de la checklist applique la remise pack. Aucune case n'est pré-cochée au chargement.
- [ ] Firefox stable : la page s'affiche sans reveals **et sans contenu manquant**.
- [ ] Transition catalogue → produit : aucun freeze > 100 ms, mesuré avec un Server Component ralenti artificiellement à 800 ms (`await sleep(800)` temporaire).
- [ ] `package.json` : toujours zéro dépendance d'animation. Le test CI de la spec 28 passe encore.
- [ ] `AggregateRating` présent dans le JSON-LD du PDP, sans `brand` ni `manufacturer` externes.

---

## Si le temps manque

Coupe dans cet ordre inverse : View Transitions, puis schéma SVG, puis reveals.
**Ne coupe jamais** la modération a priori des avis. C'est la seule ligne de cette spec dont l'absence coûte le projet entier.
