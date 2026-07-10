# Spec 27 — Refonte visuelle & fonctionnelle · aimetapiscine

> Dossier de direction artistique + conversion, basé sur recherche web (juillet 2026).
> Contexte : Next.js App Router / TypeScript / Supabase / Stripe / Zustand / Zod / Vitest.
> Contrainte non négociable : **blind-shipping**. Aucune reco ci-dessous ne fait apparaître APF.
> Le simulateur 3D reste **parké** (dépendance externe APF) — rien ici ne le réactive.

---

## Note de méthode — ce qui est mesuré vs ce qui est mon opinion

Ce document distingue trois niveaux, marqués partout :

| Marqueur | Sens |
|---|---|
| **[M]** | Mesuré. Étude, test utilisateur à grande échelle, ou A/B test avec significativité annoncée. |
| **[C]** | Constaté / déclaratif. Chiffre d'éditeur ou d'agence, non reproductible, souvent intéressé. À traiter comme une direction, pas comme une preuve. |
| **[O]** | Mon opinion de directeur artistique. Assumée, argumentée, discutable. |

Sur les sites de référence : les URL sont réelles et vérifiables. Quand un site est cité **avec sa distinction** (Awwwards SOTY, E-commerce of the Year…), la distinction est vérifiée. Quand j'analyse « ce qui fonctionne », c'est **[O]** — je n'ai pas fait passer de tests utilisateurs sur ces sites.

---

# PHASE 1 — RECHERCHE

## A) Landing pages de référence

### A1. E-commerce produit physique haut de gamme

| # | Site | Ce qui fonctionne | Transposable chez toi |
|---|---|---|---|
| 1 | **Scout Motors** — [scoutmotors.com](https://scoutmotors.com) · *Awwwards [E-commerce of the Year 2025](https://www.awwwards.com/annual-awards-2025/ecommerce-site-of-the-year), par Locomotive* | Le produit est un objet d'anxiété (prix élevé, achat long). Le site construit la **confiance avant le prix** : storytelling, matière, puis specs. Animation au service du volume de l'objet, jamais du décor. | Le liner est un achat à ~600–2500 €, décidé une fois par décennie. Même séquence : désir → matière → dimension → prix. |
| 2 | **Aesop** — [aesop.com](https://www.aesop.com) | Fiche produit éditoriale : peu d'images, beaucoup de texte structuré. La typo *est* le packaging. Buy-box sticky discrète. | Le liner a une littérature technique riche (épaisseur, vernis, pose, garantie). Aesop prouve qu'on peut vendre du texte dense sans que ça fasse notice. |
| 3 | **Hem** — [hem.com](https://www.hem.com) | Swatches matière au niveau du PDP, changement d'image instantané, pas de rechargement. Photo produit + photo « en situation » côte à côte. | Exactement le problème du liner : la couleur de la membrane ≠ la couleur de l'eau. Il faut deux visuels par coloris. |
| 4 | **Bang & Olufsen** — [bang-olufsen.com](https://www.bang-olufsen.com) | Configurateur de finitions intégré au PDP, pas dans une page à part. Le prix bouge en direct. Zoom matière très haute définition. | Le calculateur expert doit vivre **dans** le PDP, pas à côté. Voir §2. |
| 5 | **Vitra** — [vitra.com](https://www.vitra.com) | Fiche technique et dimensions traitées comme du contenu désirable (schémas cotés soignés), pas comme un PDF caché. | Ton avantage produit, c'est la cote sur-mesure. Il faut la **montrer**, pas la subir. |

### A2. Sites à composante technique / configurateur

| # | Site | Ce qui fonctionne | Transposable |
|---|---|---|---|
| 6 | **RENOLIT Alkorplan — Configurateur** — [renolit-alkorplan.com/fr/configurateur](https://renolit-alkorplan.com/fr/configurateur) | **Ton concurrent amont direct.** Il fait rêver sur la couleur de l'eau, décrit les gammes ([Vogue](https://www.renolit.com/fr/industries/maison-et-batiment/environnement/piscines/renolit-alkorplan-vogue), Touch), et… **ne vend rien**. Il renvoie vers un pisciniste. | Voilà le trou de marché. Reprends la promesse esthétique de Renolit, ajoute le bouton « Acheter ». |
| 7 | **Tesla Design Studio** — [tesla.com/model3/design](https://www.tesla.com/model3/design) | Configurateur = tunnel de vente. Chaque choix recalcule le prix et le délai. Pas de « demandez un devis ». | Le calculateur doit finir par un panier, jamais par un formulaire de contact. |
| 8 | **Brilliant Earth — Ring Builder** — [brilliantearth.com](https://www.brilliantearth.com) *(cité comme référence configurateur par [Modelup](https://www.modelup3d.com/en/blog/product-configurator-e-commerce-top-8-examples/))* | Décompose un choix anxiogène en 3 étapes séquentielles, avec retour arrière libre. | Piscine : forme → dimensions → coloris. Trois écrans, pas un formulaire de 12 champs. |
| 9 | **IKEA Kitchen Planner** — [ikea.com](https://www.ikea.com) | Le plan est **sauvegardable et partageable**. L'achat se fait plus tard, avec le conjoint. | Achat de couple, panier élevé. Un « lien de devis » persistant vaut de l'or. Cf. backlog. |

### A3. Marques outdoor / maison / piscine / spa

| # | Site | Ce qui fonctionne | Transposable |
|---|---|---|---|
| 10 | **Fermob** — [fermob.com](https://www.fermob.com) (FR) | Nuancier couleur comme colonne vertébrale de la marque. La couleur est le produit. Photo outdoor lumineuse, pas studio. | Le nuancier liner est ta grille de lecture naturelle. Voir Piste A §3. |
| 11 | **Piscinelle** — [piscinelle.com](https://www.piscinelle.com) (FR) | Le meilleur français du secteur sur la mise en scène du bassin en fin de journée. Photo = vie, pas produit. Beaucoup de preuve sociale « chantier ». | La photo de bassin réalisé (avec accord client) vaut mille photos de rouleau de PVC. |
| 12 | **Diffazur** — [diffazur.fr](https://www.diffazur.fr) (FR) | Long-form sur la technique de construction, mais servi comme du contenu de marque. | Ta page « Pose & entretien » peut être un actif SEO ET un actif de réassurance. |
| 13 | **Desjoyaux** — [desjoyaux.fr](https://www.desjoyaux.fr) (FR) | *Contre-exemple utile.* Tunnel « prise de RDV » partout, aucune transparence prix. Résultat : le prospect part chercher le prix ailleurs. | Ne fais **jamais** ça. Prix affiché, calcul de port affiché, total affiché. |

### A4. Hors-secteur, pour l'audace visuelle

| # | Site | Ce qui fonctionne | Transposable |
|---|---|---|---|
| 14 | **Igloo Inc** — *Awwwards [Site of the Year 2024](https://www.awwwards.com/inspiration_search/sites_of_the_year/)* | Cohérence totale entre l'objet 3D et la grille typographique. Le WebGL n'est pas un décor, c'est le sujet. | À regarder pour comprendre **quand** le 3D est justifié — et donc pourquoi il ne l'est pas chez toi (§B). |
| 15 | **Lusion v3** — *Awwwards [Site of the Year 2023](https://www.awwwards.com/inspiration_search/sites_of_the_year/)* | Démonstration de force technique. Ne convertit rien, n'essaie pas. | Utile comme repoussoir : le portfolio d'agence n'est pas un modèle de boutique. |
| 16 | **Opal Tadpole** — *Awwwards [Site of the Year 2024](https://www.awwwards.com/inspiration_search/sites_of_the_year/)* | Produit physique, une seule page, scroll-telling maîtrisé, achat en bas. Le meilleur compromis « awwwards + e-commerce » du lot. | **La référence structurelle la plus proche de ta homepage cible.** |
| 17 | **v0.dev** / pages marketing de **The Browser Company** *(cités comme fer de lance du brutalisme éditorial 2026 par [StudioMeyer](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check))* | Positionnement par le refus du poli. Monospace, bordures 1px, zéro ombre. | À **ne pas** copier. Ton acheteur cherche à être rassuré, pas à être impressionné. Cf. §D. |
| 18 | **Teenage Engineering** — [teenage.engineering](https://teenage.engineering) | Registre « fiche technique désirable » : la spec est mise en scène comme de la typographie. | C'est exactement le sous-registre à réserver au calculateur et aux specs. Voir §3. |

**Vérification agence :** [Locomotive](https://www.awwwards.com/annual-awards-2025/ecommerce-site-of-the-year) (E-commerce of the Year 2025) et [Immersive Garden](https://www.awwwards.com/annual-awards-2025/agency-of-the-year) (Agency of the Year 2025, Paris) sont les deux studios dont il faut lire les études de cas si tu veux calibrer le niveau attendu.

---

## B) Animation & motion

### B0. Le socle technique a changé en 2025–2026 — deux faits qui gouvernent tout

**Fait 1 — GSAP est gratuit, plugins inclus, depuis avril 2025.**
Webflow a racheté GreenSock fin 2024 et a rendu [l'intégralité de GSAP gratuite, y compris ScrollTrigger, SplitText, MorphSVG, ScrollSmoother](https://webflow.com/updates/gsap-becomes-free), pour un usage commercial. **Mais** : GSAP n'est pas open-source. Motion (ex-Framer Motion) [souligne que la licence GSAP interdit l'usage dans un outil concurrent de Webflow et que Webflow peut la résilier à sa discrétion](https://motion.dev/docs/gsap-vs-motion). Motion est MIT, irrévocable.

**Fait 2 — Les animations scroll-driven CSS natives existent mais ne sont PAS Baseline.**
Chrome depuis la v115 (juillet 2023), Safari 26 (septembre 2025). Firefox stable : [toujours derrière le flag `layout.css.scroll-driven-animations.enabled` en juin 2026](https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026), même si c'est une priorité Interop 2026. caniuse annonce ~82,6 % de support global. MDN est explicite : [`animation-timeline` n'est pas Baseline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline).

> ⚠️ Plusieurs articles français datés 2026 affirment que c'est Baseline. **C'est faux.** Ne construis pas ta stack sur cette affirmation.
>
> Le point qui sauve tout : **le mode d'échec est « pas d'animation », pas « page cassée »**. On écrit l'état révélé comme état par défaut, on emballe le mouvement dans `@supports (animation-timeline: view())`. Firefox voit une page statique, parfaitement lisible.

### B1. Tableau des patterns

| Pattern | Exemple réel | Effet | Coût perf | Faisabilité App Router | Lib recommandée | A11y |
|---|---|---|---|---|---|---|
| **Reveal à l'entrée dans le viewport** (opacity + translateY 12–16px, 300–400ms) | Opal Tadpole, Aesop | **[O]** Nul sur la conversion. Sert la perception de qualité. Ne le vends pas comme un levier de CRO. | ~0 KB en CSS pur | Server Component, zéro JS | `animation-timeline: view()` + `@supports` | Contenu visible sans JS. `prefers-reduced-motion` → `animation: none` |
| **Stagger** (60–80ms entre items) | Fermob, cartes catalogue | **[O]** Rend une grille lisible en cascade. Au-delà de 6 items, ça devient une attente. | ~0 KB. `sibling-index()` (Chrome/Safari) ou `nth-child` en dur | OK | CSS pur | Idem |
| **Hover cards produit** : swap image 1↔2, échelle 1.02, ombre | Hem | **[M]** Baymard : [80 % des sites ne fournissent pas 3+ vignettes en liste produit](https://baymard.com/blog/current-state-product-list-and-filtering). Le swap au survol est la version pauvre — utile, pas suffisant. | 0 KB si CSS. `<Image>` priority=false, `sizes` correct | OK | CSS | Doit exister au clavier (`:focus-visible`) et au tap mobile → 2e image visible en dur sur mobile |
| **Sticky buy-box desktop** | Bang & Olufsen | **[M]** A/B test Growth Rock : **+7,9 % de commandes** (99 % de significativité) avec buy-box sticky à droite du PDP. [Source](https://growrevenue.io/sticky-add-to-cart-button/) | `position: sticky` = 0 KB | OK | CSS | Ne pas piéger le focus |
| **ATC persistant mobile (drawer)** | — | **[M]** Même source, variantes testées sur PDP mobile : la variante « le bloc d'achat remonte en drawer » gagne **+6,5 % de commandes** (97 %, ~2000 conv./variante) puis **+5,2 %** en réplication (98 %) ; **+11,8 % de clics ATC**. Un autre test NZ donne **+2,74 %** (82,7 % de proba, donc **non significatif** — je le cite pour l'honnêteté). **[C]** Les éditeurs Shopify annoncent 8–15 %. À ignorer. | ~1 KB JS | OK, Client Component minimal | CSS + `IntersectionObserver` | Ne pas masquer le contenu sous le drawer (`padding-bottom` = hauteur du drawer) |
| **Image produit qui suit le scroll** (galerie sticky, colonne droite qui défile) | Vitra, Hem | **[O]** Le meilleur rapport effet/coût de tout ce tableau pour un PDP long. | 0 KB | OK | `position: sticky` | RAS |
| **View Transitions (transitions de page)** | — | **[O]** Effet « app native » sur le passage liste → produit (le thumbnail morphe en hero). Impact conversion : aucune preuve. | 0 KB de lib | ⚠️ Voir B2 | `experimental.viewTransition` + `<ViewTransition>` de React | Respecte `prefers-reduced-motion` nativement si on le déclare en CSS |
| **Parallaxe** | — | **[O]** Daté. Coût vestibulaire réel. | — | — | — | Déclencheur de nausée documenté |
| **Pinning / scroll-telling** | Apple Watch Ultra | **[M]** NN/g : [la majorité des participants sont au moins légèrement désorientés par le scrolljacking ; certains l'interprètent comme un bug ; les utilisateurs orientés tâche le tolèrent nettement moins ; c'est pire sur mobile](https://www.nngroup.com/articles/scrolljacking-101/). | Élevé | GSAP ScrollTrigger | — | Rédhibitoire |
| **Scroll fading** | — | **[M]** NN/g distingue [scroll fading (l'animation se déclenche au scroll, le scroll reste natif) de scrolljacking (le scroll est confisqué)](https://www.nngroup.com/articles/scroll-fading-101/). Le premier est acceptable **si** persistant (l'élément ne re-disparaît pas), réactif, et appliqué avec parcimonie. | Faible | OK | CSS | Le contenu doit rester lisible si l'anim ne joue pas |
| **3D / WebGL** | Igloo Inc | **[C]** Les éditeurs de configurateurs annoncent +40 % de conversion (Forbes, via [LS-VCommerce](https://www.ls-vcommerce.com/post/top-5-3d-product-configurators-for-e-commerce-websites)). **Aucun de ces chiffres n'est un A/B test publié.** Ce sont des vendeurs de 3D qui vendent de la 3D. **[M]** À l'inverse, le bilan mi-2026 de StudioMeyer : [3D/WebGL a sous-délivré, en drainant les budgets de perf plus que prévu](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check). | Rédhibitoire | three.js | — | — |

### B2. View Transitions — l'état réel en juillet 2026

- Next.js expose le flag [`experimental.viewTransition`](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition), qui active le composant `<ViewTransition>` de React pendant les navigations de route.
- Le guide officiel précise que [l'App Router tourne sur des releases canary de React et que `<ViewTransition>` n'est pas encore stable ; sans support navigateur, l'app fonctionne, la transition ne s'anime simplement pas](https://nextjs.org/docs/app/guides/view-transitions).
- Le piège documenté : l'App Router **streame** le HTML. Si tu déclenches `router.push()` vers une route dont un Server Component est lent, [le navigateur capture l'ancien snapshot puis reste figé le temps du round-trip RSC — pire que pas de transition du tout](https://www.72technologies.com/blog/view-transitions-nextjs-app-router-guide). La parade : prefetch agressif au `onMouseEnter`, et un `loading.tsx` dont le squelette a la même géométrie que la page finale.
- Durée : 200–400 ms. Au-delà de 500 ms, ça donne l'impression que le site rame.

**[O] Verdict :** oui aux View Transitions, mais **seulement** sur `catalogue → produit`, avec un `view-transition-name` sur l'image produit uniquement. Pas de transition globale sur toutes les navigations : le rapport risque/bénéfice s'inverse dès que le contenu est en streaming.

### B3. Ce qu'il ne faut PAS animer — liste ferme

1. **Le prix.** Jamais. Un prix qui compte, qui fade, qui bouge = un prix suspect. Il apparaît, point.
2. **Le résultat du calculateur.** L'utilisateur vient d'entrer 12 cotes, il est en tension. Le chiffre s'affiche instantanément.
3. **Le bouton « Ajouter au panier ».** Pas de pulse, pas de shine, pas de glow. Un `:active` qui répond en <100 ms, c'est tout. (Rappel : INP mesure **toutes** les interactions, pas la première.)
4. **La navigation principale.** Elle ne se cache pas, ne rebondit pas.
5. **Le contenu au-dessus de la ligne de flottaison.** C'est ton élément LCP. Toute animation d'entrée sur le hero repousse ton LCP.
6. **Les chiffres de réassurance** (garantie 10 ans, délai). Un compteur qui s'incrémente sur « 10 ans de garantie » est une insulte à l'intelligence de l'acheteur.
7. **Le scroll lui-même.** Ni ScrollSmoother, ni Lenis. Voir NN/g ci-dessus.
8. **Les swatches de coloris.** Le changement d'image doit être instantané (crossfade ≤120 ms maximum). L'utilisateur compare, il ne contemple pas.

### B4. Accessibilité — non négociable

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- WCAG 2.2 SC **2.2.2 Pause, Stop, Hide** (niveau A) : tout mouvement auto qui dure >5 s doit être stoppable.
- WCAG 2.2 SC **2.3.3 Animation from Interactions** (niveau AAA) : le mouvement déclenché par une interaction doit pouvoir être désactivé.
- Le troll de la doc : `prefers-reduced-motion` **ne doit pas** supprimer le contenu. Un reveal désactivé = contenu visible, pas contenu manquant. D'où la règle : **on anime depuis l'état final**, jamais vers lui.

---

## C) Méthodes de présentation produit

Toute cette section repose sur la recherche Baymard (200 000+ h de recherche, 4 400+ sessions de tests modérés). Constat cadre : [seuls 48 % des sites desktop et 38 % des sites mobiles ont une UX de page produit « correcte » ou « bonne » ; 62 % du mobile est « médiocre ou pire »](https://baymard.com/blog/current-state-ecommerce-product-page-ux).

### C1. Galerie

| Règle | Statut | Donnée |
|---|---|---|
| Ne jamais tronquer les vignettes sans indiquer qu'il y en a d'autres | **[M]** | [Tronquer fait rater 50 à 80 % des images supplémentaires ; 30 % des sites le font](https://baymard.com/blog/truncating-product-gallery-thumbnails) |
| Vignettes sur mobile aussi | **[M]** | [76 % des sites mobiles ne le font pas](https://baymard.com/blog/collections/product-page) |
| Image « à l'échelle » obligatoire | **[M]** | [42 % des utilisateurs cherchent à déduire la taille depuis les photos ; 37 % des sites ne fournissent aucune image à l'échelle](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| Zoom / pinch sur mobile | **[M]** | [40 % des sites mobiles ne supportent pas pinch ou tap-to-zoom](https://baymard.com/blog/scale-mobile-product-images-in-landscape) |

**[O] Traduction liner.** Un rouleau de PVC photographié sur fond blanc ne vend rien. Il te faut, par coloris, **quatre plans obligatoires** :
1. **Macro matière** (grain, relief 3D Touch, vernis) à 2000 px, zoomable.
2. **Le bassin rempli** — c'est ça que l'acheteur achète : la couleur de l'eau, pas la couleur du PVC.
3. **Échelle** : la membrane avec une main, ou un mètre déplié posé dessus. Ça résout ton anxiété de dimensionnement visuellement.
4. **Raccord / soudure** en gros plan. C'est le point de doute technique n°1 sur une membrane armée.

> 🔒 **Garde-fou blind-shipping.** Aucune photo fournisseur telle quelle. Toutes les images doivent passer par un pipeline de **strip EXIF/IPTC/XMP** avant upload Supabase Storage. Un champ `Creator` ou `Copyright` contenant le nom du fournisseur dans une image publique, c'est le blind-shipping mort. Ajoute un test Vitest sur le pipeline d'import qui échoue si des métadonnées non blanches subsistent.

### C2. Layout du contenu long — le point le plus important de ce document

**[M] N'utilise pas d'onglets horizontaux.** Baymard : [27 % des utilisateurs ratent complètement le contenu caché dans des onglets horizontaux, contre 8 % avec des sections verticalement repliables ; 28 % des sites e-commerce utilisent pourtant ce pattern](https://growrevenue.io/avoid-horizontal-tabs/). Les deux seuls layouts qui performent : **sections verticales repliables** ou **page longue avec sommaire sticky**.

**[M] Structure la description par « points forts » (highlights).** [Une description découpée en highlights, chacun avec son image, pousse les utilisateurs à explorer plus en profondeur tout en ayant l'impression de survoler ; 78 % des sites ne le font pas.](https://baymard.com/blog/structure-descriptions-by-highlights) C'est le pattern idéal pour : *Épaisseur & armature · Le vernis · La pose · L'entretien · La garantie*.

### C3. Réassurance sur le coût — le vrai tueur

**[M]** Baymard, [statistiques d'abandon de panier](https://baymard.com/lists/cart-abandonment-rate) (moyenne documentée : **70,22 %** sur 50 études). Hors « je regardais juste » (43 %), les motifs :

| Motif | % |
|---|---|
| Frais annexes trop élevés (port, taxes) | **39 %** |
| Livraison trop lente | 21 % |
| Pas confiance pour la CB | 19 % |
| Le site voulait un compte | 19 % |
| Checkout trop long / compliqué | 18 % |
| Politique de retour insatisfaisante | 15 % |
| Impossible de calculer le total en amont | 14 % |

Corollaires directs pour le PDP :

- **[M]** [67 % des sites ne donnent aucune estimation du coût total près du bloc d'achat](https://baymard.com/blog/current-state-ecommerce-product-page-ux). Tu as déjà la logique de frais de port + surcharge Corse en config. **Expose-la sur le PDP**, pas seulement au checkout.
- **[M]** [44 % des sites n'affichent ni ne lient la politique de retour depuis le PDP, alors que 60 % des utilisateurs l'y cherchent](https://baymard.com/blog/current-state-ecommerce-product-page-ux).
- **[M]** [81 % des sites n'affichent pas le prix à l'unité pour les produits vendus en quantités variables](https://baymard.com/blog/current-state-ecommerce-product-page-ux). **Pour toi : le prix au m².** C'est le seul chiffre qui permet à un pisciniste pro de comparer une offre à une autre. Tu dois l'afficher.

> 🔗 Rappel d'architecture (decisions.md) : tout ça doit passer par **la fonction unique de calcul de prix**. Le prix au m² affiché sur le PDP, le total estimé, le panier et la facture PDF doivent être quatre lectures de la même fonction. Sinon tu réintroduis la divergence HT/TTC que tu as déjà corrigée.

### C4. Sélecteurs de variantes

**[M]** [57 % des sites utilisent un menu déroulant pour la taille au lieu de boutons exposés ; les tailles cachées dans un select empêchent de voir ce qui est disponible.](https://baymard.com/blog/current-state-ecommerce-product-page-ux)

**[O] Traduction liner.** Deux natures de variantes, qu'il ne faut surtout pas mélanger :

- **Coloris / finition** = variante *discrète*, énumérable → **swatches boutons**, jamais un select. Chaque swatch porte le nom (`Sable`, `Gris ardoise`, `Touch Prestige`) — un carré de couleur seul est illisible pour un daltonien.
- **Dimensions** = variante *continue*, non énumérable → **c'est le calculateur, pas un sélecteur.** Ne tente jamais de la présenter comme une liste d'options.

C'est précisément là que ton calculateur existant devient un avantage concurrentiel et pas un formulaire.

### C5. Preuve sociale

- **[M]** [89 % des sites ne répondent pas aux avis négatifs](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — y répondre est perçu positivement, à condition de styliser la réponse différemment de l'avis.
- **[M]** [63 % des sites ne permettent pas de naviguer d'une photo client à l'autre à travers les avis](https://baymard.com/blog/current-state-ecommerce-product-page-ux). Les photos clients sont jugées plus objectives que les photos officielles.
- **[M]** [89 % des sites cassent la fonction « Enregistrer » en la réservant aux comptes ; 21 % des utilisateurs s'appuient sur ces fonctions](https://baymard.com/blog/current-state-ecommerce-product-page-ux). → **wishlist en invité**, persistée en localStorage puis migrée au login.

> 🔒 **Garde-fou blind-shipping sur l'UGC.** C'est ton risque n°1 non traité. Un client photographie son colis, le carton porte le nom du fournisseur, la photo part dans les avis. Ou un avis écrit dit « livré par APF ».
>
> **Règle produit :** modération **a priori** obligatoire sur les avis avec photo. Plus un filtre serveur : une denylist de tokens (raison sociale, marques, formes juridiques) exécutée sur le texte de l'avis **et** sur le nom de fichier de l'image, avant persistance. Le même helper que celui déjà utilisé pour l'enforcement blind-shipping sur les messages d'erreur (spec 15). Test Vitest dédié.

### C6. Upsell / cross-sell non intrusif

**[O]** Ne le mets pas au-dessus des avis. Ne le mets pas dans la buy-box. La seule place qui marche pour un panier élevé, c'est **après** la décision, en bas de PDP et dans le panier, sous la forme « on n'oublie rien ? » :

- colle PVC, profilé de finition, sac de lestage, produit de nettoyage.
- Formulés comme une **checklist de chantier**, pas comme une vente. « Pour poser ce liner, il vous faudra aussi : ».
- Baymard **[M]** : [44 % des sites ne clarifient pas quels accessoires sont inclus vs en supplément](https://baymard.com/blog/collections/product-page). Sur une membrane armée, c'est une source d'appels SAV massive.

Ton système de remises par pack existant se branche naturellement ici : la checklist devient un pack, le pack déclenche la remise, et la remise est le seul argument affiché.

---

## D) Tendances 2026 — ce qui est frais, ce qui date

**Source de référence honnête :** le bilan à 6 mois de [StudioMeyer](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check), qui reprend sa propre liste de janvier 2026 et note ce qui a tenu.

### Ce qui tient

| Tendance | Verdict | Pour toi |
|---|---|---|
| **Bento grid** | A tenu, mais est devenu ubiquitaire. | Utilisable **une fois**, pour la section « pourquoi une membrane armée ». Pas pour la homepage entière. |
| **Typographie comme architecture** | Tient. Titres au `clamp()` fluide, échelle nette, pas de sauts de breakpoint. | Adopte. Coût zéro, gain fort. |
| **Neo-serif + monospace** *(pairing signature 2026)* | Tient. Le mono porte les métadonnées (cotes, refs, épaisseurs). | **Adopte** — c'est fait pour un produit coté. |
| **Animations scroll-driven CSS** | Tient techniquement, pas Baseline (cf. B0). | Adopte avec `@supports`. |
| **Dark mode** | Tient. | **[O] Refuse.** L'eau et la couleur sont ton produit. Un liner « Sable » sur fond noir ne ressemble à rien. Une boutique de matériau est une boutique de lumière. |

### Ce qui vieillit mal

- **WebGL / 3D en hero.** [A sous-délivré, budget de perf drainé.](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check) Confirme ta décision de parker le simulateur.
- **Kinetic typography partout.** Passée du statut de tendance à celui de vernis. Sur le hero, à la rigueur. Ailleurs, non.
- **Glassmorphism.** Survit sur la nav et les modales. Partout ailleurs, c'est 2021.
- **Brutalisme éditorial / anti-grille.** Contre-mouvement réel en 2026 ([sites indie SaaS, v0.dev](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check)). **[O] Interdit chez toi.** Une agence Webflow le dit mieux que moi : l'anti-design marche pour les studios créatifs et la mode, et [ne marche nulle part où l'audience a besoin d'être rassurée](https://www.itsbuzzinteractive.com/blog/top-web-design-trends). Ton acheteur engage 1500 € sur une pièce qu'il ne peut pas retourner facilement.
- **Neumorphism / soft UI.** Mort.
- **Compteurs animés, badges « 12 personnes regardent ce produit ».** Décrédibilisant sur du panier élevé.

### Ce qui est nouveau et que personne n'a vu venir

**La couche de lisibilité machine (AI readability).** `llms.txt`, `schema.org` / JSON-LD sur chaque PDP, données structurées Product + Offer + AggregateRating. [StudioMeyer](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check) : une part croissante de la découverte passe par des assistants, et un site qu'une IA ne peut pas citer est invisible pour eux.

**[O] C'est ta plus grosse opportunité SEO sous-évaluée.** « Quel liner pour une piscine 8×4 avec escalier roman ? » est une question qu'on pose à un assistant, pas à Google. Il te faut du JSON-LD `Product` propre, et une FAQ inline balisée. Coût : quelques heures. Effet : structurel.

> 🔒 Le JSON-LD ne doit exposer ni `brand`, ni `manufacturer`, ni `seller` autres que aimetapiscine. C'est un vecteur de fuite blind-shipping que personne ne pense à auditer.

---

# PHASE 2 — SYNTHÈSE

## 1. HOMEPAGE — architecture, section par section

### Principe directeur

**[O]** Ta homepage a un et un seul travail : **transformer une angoisse de dimensionnement en un début de désir esthétique, puis rendre le calcul évident.** Tout le reste est décor.

Le visiteur type arrive avec « mon liner est fissuré / décoloré, je ne sais pas quoi commander, j'ai peur de me tromper de 5 cm et de perdre 1200 € ». La homepage doit répondre dans cet ordre : *« On sait faire. Voici à quoi ça va ressembler. Voici comment on mesure. Voici le prix. »*

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│  [nav]  aimetapiscine    Liners  Membranes  Accessoires  Pro   🛒 ☰  │  ← statique, jamais animée
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ██ 01 · HERO — « LE BASSIN »                                       │
│                                                                      │
│   ┌────────────────────────────────┐   Votre liner,                  │
│   │                                │   sur mesure, en 10 jours.      │
│   │   PHOTO BASSIN PLEIN, PLEIN    │                                 │
│   │   CADRE, LUMIÈRE FIN D'APRÈM   │   Membranes armées et liners    │
│   │                                │   découpés à vos cotes exactes. │
│   │   ← swatches horizontaux →     │                                 │
│   │   ● ● ● ● ● ●                  │   [ Calculer mes dimensions ]   │
│   │   Sable · Gris · Blanc · …     │   [ Voir les coloris ]          │
│   └────────────────────────────────┘                                 │
│                                                                      │
│   ↑ SIGNATURE : cliquer un swatch change la photo du bassin.         │
│     Crossfade 120ms. C'est tout. Pas de 3D. Pas de scroll.           │
│     L'image est l'élément LCP → priority, fetchpriority=high,        │
│     AVIF, aucune animation d'entrée.                                 │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 02 · BARRE DE RÉASSURANCE (statique, 4 items, sans icônes cutes)│
│   Garantie 10 ans · Découpe sur mesure · Livraison 10j · Paiement 3x │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ██ 03 · LE CALCULATEUR, MIS EN SCÈNE                               │
│                                                                      │
│   « Trois questions. Un prix. »                                      │
│                                                                      │
│   ┌──────────────────┐  ┌──────────────────────────────────────────┐ │
│   │  ○ Rectangulaire │  │  Longueur  [ 8,00 ] m                    │ │
│   │  ○ Ovale         │  │  Largeur   [ 4,00 ] m                    │ │
│   │  ○ Haricot       │  │  Profondeur [1,50] m                     │ │
│   │  ○ Sur plan      │  │                                          │ │
│   │  [schéma coté]   │  │  → 46,4 m² · à partir de 1 240 € TTC     │ │
│   └──────────────────┘  │     [ Continuer sur le calculateur → ]   │ │
│                         └──────────────────────────────────────────┘ │
│                                                                      │
│   ↑ Teaser à 3 champs. Pas le calculateur complet.                   │
│     Il pré-remplit le calculateur expert et l'ouvre à l'étape 2.     │
│     Objectif : franchir la peur du formulaire, pas le remplacer.     │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 04 · NUANCIER — la vitrine                                      │
│   Grille 3 col. desktop / 2 col. mobile. Chaque carte = un coloris.  │
│   Photo macro matière au repos → photo bassin au survol.             │
│   Reveal au scroll, stagger 60ms, 6 items max avant "Tout voir".     │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 05 · « COMMENT ÇA MARCHE » — 4 étapes typées                    │
│   01 Vous mesurez  02 Nous découpons  03 Nous livrons  04 Vous posez │
│   ↑ Numérotation légitime : c'est une vraie séquence temporelle.     │
│   Pas d'animation. Un schéma par étape. Texte court.                 │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 06 · PREUVE — bassins réalisés                                  │
│   3 photos clients + note globale + 1 avis long, cité.               │
│   Photos avec accord écrit. Modération a priori. Zéro colis visible. │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 07 · BENTO « POURQUOI UNE MEMBRANE ARMÉE »                      │
│   ┌────────────┬───────┬───────┐  Épaisseur · Vernis · Armature ·    │
│   │  75/100e   │ vernis│ 2mm   │  Étanchéité indépendante du support │
│   ├────────────┴───┬───┴───────┤  ← ici, et seulement ici, du bento  │
│   │  garantie 10a  │ antidérap.│                                     │
│   └────────────────┴───────────┘                                     │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 08 · ESPACE PRO (SIRET)                                         │
│   Bandeau sobre. Remise pro, facturation, commandes multiples.       │
│   Un seul CTA. Ne parasite pas le particulier.                       │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 09 · FAQ INLINE (sections repliables, PAS d'onglets)            │
│   Balisée schema.org/FAQPage.                                        │
├──────────────────────────────────────────────────────────────────────┤
│   ██ 10 · FOOTER — retours, livraison, contact, mentions             │
│   [M] Baymard : liens « Retours » et « Livraison » en dur au footer. │
└──────────────────────────────────────────────────────────────────────┘
```

### Justification section par section

| # | Rôle | Pattern visuel | Animation | Pourquoi ça convertit |
|---|---|---|---|---|
| 01 | Désir + promesse | Plein cadre, photo, swatches | **Aucune à l'entrée.** Crossfade 120 ms au clic swatch | C'est l'élément LCP. **[M]** 0,1 s de gain de chargement = +8 % de conversion en retail ([Google/Deloitte via Adfinite](https://adfinite.com/blog/shopify-core-web-vitals-inp)). Toute animation de hero coûte du LCP. |
| 02 | Lever les frais annexes tout de suite | Barre texte | Aucune | **[M]** 39 % des abandons = frais annexes. Répondre avant qu'on demande. |
| 03 | Désamorcer l'angoisse de mesure | Split : schéma / champs | Aucune sur les champs | **[O]** Le calculateur est ton actif unique. Le cacher derrière une nav item, c'est le gaspiller. Le teaser à 3 champs a un coût cognitif quasi nul et crée l'engagement (effet d'escalier). |
| 04 | Faire rêver | Grille + hover swap | Reveal + stagger CSS | **[M]** 80 % des sites n'ont pas 3+ vignettes en liste. Le survol qui montre le bassin plein est la réponse. |
| 05 | Réduire l'incertitude du process | 4 étapes numérotées | Aucune | La numérotation encode une vraie séquence (règle : ne numéroter que ce qui est ordonné). |
| 06 | Réassurance sociale | Photos + avis long | Aucune | **[M]** Les photos clients sont jugées plus objectives que les officielles. |
| 07 | Argumentaire technique | Bento | Reveal | Le seul endroit où le bento est justifié : des faits hétérogènes de même niveau. |
| 08 | Segment pro | Bandeau | Aucune | Ton compte pro SIRET existe. Il ne se découvre pas dans le footer. |
| 09 | Objections résiduelles | Sections repliables | Aucune | **[M]** 27 % ratent le contenu en onglets horizontaux vs 8 % en sections verticales. |
| 10 | Confiance | Footer dense | Aucune | **[M]** 15 % abandonnent sur une politique de retour insatisfaisante. |

---

## 2. PAGE PRODUIT

### Wireframe desktop

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Accueil › Membranes armées › Alkorplan Touch — Sable        [fil d'ariane] │
├───────────────────────────────────────┬────────────────────────────────────┤
│                                       │                                    │
│  ┌─────────────────────────────────┐  │  Membrane armée 2 mm — Sable       │
│  │                                 │  │  ★★★★☆ 4,6 · 87 avis               │
│  │   IMAGE PRINCIPALE              │  │                                    │
│  │   (macro matière, zoomable)     │  │  ── COLORIS ────────────────────   │
│  │                                 │  │  [Sable][Gris][Blanc][Bleu][3D]    │
│  │   ⟵ colonne sticky              │  │  ↑ boutons, jamais un <select>     │
│  └─────────────────────────────────┘  │                                    │
│  [▪][▪][▪][▪][▪][▪]  ← TOUTES        │  ── DIMENSIONS ─────────────────    │
│      les vignettes visibles           │  ○ Je connais mes cotes            │
│      (jamais tronquées)               │  ● Aidez-moi à mesurer  ← défaut   │
│                                       │                                    │
│  ┌─────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│  │  Vue 2 : LE BASSIN REMPLI       │  │  │ CALCULATEUR (inline, étape 1)│  │
│  │  Vue 3 : ÉCHELLE (mètre + main) │  │  │ Forme  [Rectangulaire ▾]     │  │
│  │  Vue 4 : SOUDURE / RACCORD      │  │  │ L [8,00] l [4,00] P [1,50]   │  │
│  └─────────────────────────────────┘  │  │ + escalier ? [ ] roman [ ]…  │  │
│                                       │  │ ─────────────────────────────│  │
│                                       │  │ Surface   46,4 m²            │  │
│                                       │  │ Prix / m²      26,72 € TTC   │  │← [M] 81% ne le font pas
│                                       │  │ Membrane    1 240,00 € TTC   │  │
│                                       │  │ Livraison      +49,00 €      │  │← [M] 67% ne le font pas
│                                       │  │ ═════════════════════════════│  │
│                                       │  │ TOTAL ESTIMÉ 1 289,00 € TTC  │  │
│                                       │  └──────────────────────────────┘  │
│                                       │                                    │
│                                       │  [   AJOUTER AU PANIER   ]         │
│                                       │   ↑ zéro animation. <100ms.        │
│                                       │                                    │
│                                       │  ✓ Garantie 10 ans                 │
│                                       │  ✓ Découpe sur mesure, non repris  │
│                                       │    → Politique de retour           │← [M] 60% la cherchent ici
│                                       │  ✓ Expédié sous 10 jours ouvrés    │
│                                       │                                    │
│                                       │  ⟵ buy-box STICKY  [M] +7,9% CA    │
└───────────────────────────────────────┴────────────────────────────────────┘
│                                                                            │
│  ██ HIGHLIGHTS  ← sections verticales, image + titre + paragraphe          │
│  ┌──────────┐  L'armature polyester                                        │
│  │  photo   │  Deux feuilles de PVC-P calandrées, une trame prise en       │
│  │  macro   │  sandwich. L'étanchéité n'est plus solidaire de la structure.│
│  └──────────┘                                                              │
│  ┌──────────┐  Le vernis de surface                                        │
│  ...         [M] 78% des sites ne structurent pas par highlights           │
│                                                                            │
│  ██ FICHE TECHNIQUE — tableau, pas de PDF                                  │
│  ██ POSE — vidéo + étapes                                                  │
│  ██ ENTRETIEN                                                              │
│  ██ AVIS (87) — distribution des notes cliquable, photos clients           │
│      navigables entre avis [M] 63% ne le permettent pas                    │
│      réponses de la marque stylées différemment [M] 89% ne répondent pas   │
│  ██ « POUR POSER CE LINER, IL VOUS FAUDRA AUSSI » → pack + remise          │
│  ██ FAQ INLINE                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Mobile — les 3 différences

1. **ATC drawer persistant.** Bouton fixe en bas → au tap, le bloc d'achat remonte en drawer (prix, coloris, cotes, valider). **[M]** C'est la variante gagnante des tests Growth Rock (+6,5 % de commandes, +11,8 % de clics ATC).
2. **Vignettes visibles.** Pas de carrousel à points seuls. **[M]** 76 % des sites mobiles n'ont pas de vignettes.
3. **Calculateur = plein écran.** Sur mobile, le calculateur inline devient une feuille modale plein écran, avec un seul champ par vue. Pas 12 champs empilés.

### Le point le plus délicat : les variantes dimensionnelles

**[O]** Tu ne dois **jamais** rendre visible le fait qu'une membrane sur-mesure n'a pas de SKU. Le PDP doit se comporter comme un PDP normal :

- Il a un prix affiché à l'arrivée (« à partir de X € », basé sur une dimension médiane du marché : 8×4×1,5).
- Le calculateur **modifie ce prix** au lieu de le révéler.
- Le bouton ATC est **actif dès l'arrivée**, avec les cotes par défaut. Il ne dit jamais « configurez d'abord ».

Pourquoi : un bouton grisé au chargement est un mur. Un prix qui se précise est un escalier.

### Réassurance sur la mesure — trois dispositifs

1. **Le schéma coté.** Tant que l'utilisateur remplit, un schéma SVG de sa piscine se met à jour avec ses cotes. Pas de 3D. Un SVG coté, comme un plan d'architecte. C'est le langage de confiance de ce métier.
2. **Le lien « Comment mesurer ».** Ouvre un panneau latéral avec 4 schémas et une phrase par cote. Ne quitte pas la page.
3. **La garantie de reprise en cas d'erreur de mesure.** **[O]** Si ton fournisseur le permet commercialement, c'est **le levier de conversion le plus fort de tout ce document**, et de très loin. 15 % des abandons sont dus à la politique de retour ; sur du sur-mesure non repris, ce chiffre est mécaniquement plus haut. Un « Erreur de cote ? On refait, vous payez la matière » supprime la peur centrale. À arbitrer avec la marge, pas avec le design.

### Matière et couleur

Deux images par coloris, systématiquement, et le libellé qui va avec :

> **Sable** — la membrane est beige clair. **L'eau paraît turquoise.**

C'est la seule phrase qui compte. Les gens n'achètent pas une membrane beige, ils achètent une eau turquoise. Renolit le comprend et le communique. Les revendeurs FR ne le font pas.

### Upsell

En bas, jamais dans la buy-box. Formulé en checklist de pose. Branché sur le système de packs existant. **[M]** [44 % des sites ne clarifient pas ce qui est inclus vs en supplément](https://baymard.com/blog/collections/product-page) → chaque item porte explicitement « non inclus ».

---

## 3. DIRECTION VISUELLE — 3 pistes

> Note de méthode : j'écarte volontairement les trois palettes vers lesquelles converge tout le design assisté aujourd'hui — fond crème (~#F4F1EA) + serif contrasté + accent terracotta ; noir profond + un seul vert acide ; et le pastiche broadsheet à filets 1px. Aucune n'est mauvaise ; toutes sont des défauts, pas des choix.

---

### Piste A — « NUANCIER »
*Éditorial matière. Le produit est un échantillon, le site est un présentoir.*

| | |
|---|---|
| **Display** | **Bricolage Grotesque** (variable, SIL OFL). Grotesque à contrastes irréguliers, un peu bancale, jamais neutre. Poids 700, `wdth` 100. |
| **Body** | **Inter Tight**, 400/500. |
| **Utility** | **JetBrains Mono** 400 — cotes, m², références, épaisseurs. Uniquement pour les nombres et les métadonnées. |
| **Échelle** | `clamp()` fluide. Ratio 1.25 mobile / 1.333 desktop. H1 `clamp(2.5rem, 6vw, 5rem)`, tracking `-0.02em`. Corps 17px / 1.6. |
| **Palette** | `#101314` encre · `#F2F3EF` blanc de chaux · `#3FB6A8` turquoise (couleur de l'eau, PAS un accent d'UI) · `#0E5C8A` bleu profond · `#B6B3AA` gris margelle · `#E8452B` signal (erreurs uniquement, jamais décoratif) |
| **Densité** | Aérée. `--space-section: clamp(5rem, 10vw, 9rem)`. |
| **Grille** | 12 colonnes, gouttière 24px, max-width 1360px. Les blocs matière **débordent** en full-bleed. |
| **Photo** | Lumière naturelle du sud, ombres dures, jamais de studio. Macro et plein cadre. Interdiction absolue de la photo de rouleau sur fond blanc. |
| **Motion signature** | Le swatch. Un seul geste, répété partout : je clique une couleur, l'eau change. 120 ms. |
| **Incarné par** | [Fermob](https://www.fermob.com), [Hem](https://www.hem.com), [Aesop](https://www.aesop.com) |

---

### Piste B — « BUREAU D'ÉTUDES »
*Premium technique. Le site est un plan coté. La précision est la promesse.*

| | |
|---|---|
| **Display** | **Archivo Expanded** 600–700, très large, capitales. |
| **Body** | **Archivo** 400. |
| **Utility** | **JetBrains Mono** — omniprésent. Toute cote, tout prix, toute référence. |
| **Échelle** | Serrée. H1 `clamp(2rem, 4vw, 3.25rem)`. Tout est plus petit qu'ailleurs. La confiance vient de la densité maîtrisée. |
| **Palette** | `#1A1D1F` graphite · `#E9EBEA` papier · `#2FA8D4` cyan de cotation · `#6B7478` ardoise · `#C4302B` rouge repère (5 % max) |
| **Densité** | Dense. Tableaux, filets, alignements stricts. |
| **Grille** | 16 colonnes. Alignement sur baseline. |
| **Photo** | Minoritaire. Le schéma SVG coté remplace la photo. |
| **Motion signature** | Les cotes qui se dessinent (`stroke-dasharray`) quand le schéma se met à jour. 250 ms. |
| **Incarné par** | [Teenage Engineering](https://teenage.engineering), [Vitra](https://www.vitra.com), [Tesla Design Studio](https://www.tesla.com/model3/design) |

---

### Piste C — « BORD DE BASSIN »
*Chaleur outdoor. Le site vend un soir de juillet.*

| | |
|---|---|
| **Display** | **Fraunces** (variable, `SOFT` et `WONK` activés), 500–600. Serif optique, chaleureuse, non conventionnelle. |
| **Body** | **Instrument Sans** 400. |
| **Utility** | **Instrument Sans** 500, `tabular-nums`. |
| **Échelle** | Généreuse. H1 `clamp(2.75rem, 7vw, 6rem)`, interlignage 0.95. |
| **Palette** | `#2C2A26` encre chaude · `#D8D3C7` pierre sèche · `#0F6B6B` sarcelle profonde · `#7FA8A0` eau claire · `#E8A33D` soleil rasant (≤5 % de surface) |
| **Densité** | Moyenne. Beaucoup de photo pleine largeur. |
| **Grille** | Asymétrique 8/4, décalages assumés. |
| **Photo** | Fin de journée, contre-jour, présence humaine (pieds au bord, serviette, verre). |
| **Motion signature** | Un très lent panoramique sur la photo hero (transform 20 s, ±2 %). |
| **Incarné par** | [Piscinelle](https://www.piscinelle.com), [Diffazur](https://www.diffazur.fr), [Aesop](https://www.aesop.com) |

---

### 🎯 Recommandation — une seule

# **Piste A — « NUANCIER »**, avec le vocabulaire de la Piste B confiné au calculateur, à la fiche technique et aux tableaux de cotes.

Ce n'est pas un compromis, c'est une hiérarchie. **Nuancier est la direction. Bureau d'études est un registre à l'intérieur d'elle**, réservé aux zones où l'utilisateur bascule du désir vers la vérification. Comme une revue de design qui passe en corps 8 et en mono quand elle publie une nomenclature.

**Pourquoi A et pas C.** C est la plus belle. C est aussi ce que font déjà Piscinelle et Diffazur — et ce sont des constructeurs, pas des marchands. Sur une boutique, l'émotion outdoor pure produit des visiteurs qui rêvent et un panier vide. Le liner n'est pas un rêve, c'est une **décision de réparation**. A vend la couleur (le désir) sans jamais quitter le registre du matériau (la décision).

**Pourquoi A et pas B.** B est la plus juste techniquement, et la plus mortelle commercialement. C'est le site que ferait un ingénieur. Ton acheteur particulier est terrifié par la technique — la lui servir comme identité, c'est confirmer sa peur. B doit rassurer *après* que A ait donné envie.

**Pourquoi A gagne.** Le nuancier est le seul objet du métier qui soit à la fois **beau** et **fonctionnel**. C'est l'outil que le pisciniste pose sur la table de cuisine du client. Faire du site un nuancier, c'est transposer le geste de vente réel. Et c'est le seul territoire que Renolit occupe en amont et que **personne n'occupe côté marchand**.

**Le risque assumé** (le skill dit d'en prendre un) : le hero n'a **aucune animation d'entrée**. Là où tous tes concurrents et toutes les refontes de 2026 posent un reveal, un parallaxe, un compteur — toi tu poses une image, immédiate, et six pastilles de couleur. Le silence visuel, dans un marché qui crie, est le positionnement. Il a en plus le bon goût d'être le meilleur LCP possible.

---

## 4. FONCTIONNALITÉS — backlog priorisé

Impact conversion : 1 (marginal) → 5 (structurel). Effort : S (<1j) / M (1–3j) / L (>3j) pour un dev solo.

| # | Feature | Impact | Effort | Dépendances | Source |
|---|---|---|---|---|---|
| 1 | **Coût total estimé (produit + port) dans la buy-box** | **5** | M | Fonction unique de calcul de prix, logique frais de port existante | **[M]** [39 % d'abandons = frais annexes ; 67 % des sites ne l'affichent pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| 2 | **Buy-box sticky desktop** | **5** | S | — | **[M]** [+7,9 % de commandes, 99 %](https://growrevenue.io/sticky-add-to-cart-button/) |
| 3 | **ATC drawer persistant mobile** | **5** | M | Zustand (déjà là) | **[M]** [+6,5 % de commandes, 97 % ; +11,8 % clics ATC](https://growrevenue.io/sticky-add-to-cart-button/) |
| 4 | **Calculateur inline dans le PDP** (pas une page à part) | **5** | L | Calculateur existant, refactor en composant client isolé | **[O]** + Tesla / Bang & Olufsen |
| 5 | **Prix au m² affiché** | 4 | S | Fonction de prix | **[M]** [81 % des sites ne le font pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — bloquant pour le segment pro |
| 6 | **Sections verticales repliables** (bannir tout onglet horizontal) | 4 | S | — | **[M]** [27 % ratent le contenu en onglets vs 8 %](https://growrevenue.io/avoid-horizontal-tabs/) |
| 7 | **Politique de retour liée depuis le PDP** | 4 | S | Page CGV | **[M]** [60 % la cherchent sur le PDP ; 44 % des sites ne la lient pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| 8 | **Galerie : toutes les vignettes, jamais tronquées, zoom + pinch** | 4 | M | Assets photo réels (bloquant) | **[M]** [tronquer fait rater 50–80 % des images](https://baymard.com/blog/truncating-product-gallery-thumbnails) ; [40 % des mobiles n'ont pas de pinch-zoom](https://baymard.com/blog/scale-mobile-product-images-in-landscape) |
| 9 | **Image « à l'échelle »** (membrane + mètre + main) | 4 | S | Shooting photo | **[M]** [42 % des users déduisent la taille des photos ; 37 % des sites n'en ont pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| 10 | **Swatches boutons + libellé (« Sable → eau turquoise »)** | 4 | M | 2 photos / coloris | **[M]** [57 % des sites utilisent un select](https://baymard.com/blog/current-state-ecommerce-product-page-ux) ; a11y daltonisme |
| 11 | **Avis avec photos clients navigables entre avis** | 3 | L | Table `reviews`, modération, RLS | **[M]** [63 % ne le permettent pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| 12 | **Réponses de la marque aux avis négatifs, stylées à part** | 3 | M | ⬆ | **[M]** [89 % ne répondent pas](https://baymard.com/blog/current-state-ecommerce-product-page-ux) |
| 13 | **Filtre blind-shipping sur avis + noms de fichiers + EXIF strip** | 3 | M | Pipeline upload, helper spec 15 | **[O]** Risque de fuite critique |
| 14 | **Description structurée par highlights** (image + titre + para) | 3 | M | Contenu rédactionnel | **[M]** [78 % des sites ne le font pas](https://baymard.com/blog/structure-descriptions-by-highlights) |
| 15 | **JSON-LD Product/Offer/FAQPage + `llms.txt`** | 3 | S | — | **[M]/[O]** [Découverte via assistants](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check) |
| 16 | **Wishlist / devis sauvegardable en invité** (lien partageable) | 3 | M | localStorage → Supabase à la connexion | **[M]** [21 % s'appuient sur « Save » ; 89 % des sites le réservent aux comptes](https://baymard.com/blog/current-state-ecommerce-product-page-ux) — achat de couple |
| 17 | **Teaser calculateur 3 champs en homepage** | 3 | M | ⬆ #4 | **[O]** |
| 18 | **Schéma SVG coté qui se met à jour** | 2 | L | Calculateur | **[O]** Réassurance mesure |
| 19 | **Checklist de pose → pack → remise** | 2 | M | Système de packs existant | **[M]** [44 % ne clarifient pas inclus/en supplément](https://baymard.com/blog/collections/product-page) |
| 20 | **View Transitions catalogue → produit** | 1 | M | `experimental.viewTransition`, React canary | **[O]** Polish. Aucune preuve de conversion. **Dernier.** |
| 21 | **Reveals CSS scroll-driven** | 1 | S | `@supports` | **[O]** Perception de qualité. Zéro KB. |

**Ce que je retire du backlog :** dark mode, 3D/WebGL, scroll-telling, parallaxe, compteurs animés, badges d'urgence, chat widget (coût INP > bénéfice sur ce volume), carrousel de hero.

---

## 5. ANTI-PATTERNS — à bannir sur cette boutique

| Anti-pattern | Pourquoi c'est fatal ici |
|---|---|
| **Onglets horizontaux pour Specs / Avis / Livraison** | **[M]** 27 % ne verront jamais tes avis. Sur un panier à 1200 €, l'avis *est* la conversion. |
| **Prix révélé seulement après configuration** | Ton acheteur compare 4 sites. Celui qui cache le prix est éliminé au premier scroll. Desjoyaux fait ça. Ne le fais pas. |
| **Bouton ATC désactivé tant que le formulaire n'est pas rempli** | Transforme un escalier en mur. |
| **Frais de port découverts au checkout** | **[M]** 39 % des abandons. C'est le premier motif, loin devant. |
| **Compte obligatoire pour enregistrer un devis** | **[M]** 19 % des abandons. |
| **Scrolljacking / smooth scroll / pinning** | **[M]** NN/g : désorientation majoritaire, pire sur mobile, interprété comme un bug par les utilisateurs orientés tâche. Ton utilisateur est *exclusivement* orienté tâche. |
| **Hero vidéo autoplay** | Tue le LCP, tue la data mobile, tue la batterie. **[M]** 0,1 s de LCP = 8 % de conversion en retail. |
| **3D / WebGL du bassin** | **[C]** Les gains annoncés viennent tous d'éditeurs de configurateurs 3D. **[M]** Le bilan 2026 dit que le WebGL a drainé les budgets de perf. Et tu es bloqué sur une dépendance APF. Reste parké. |
| **Brutalisme éditorial** | Signale « je suis cool » à quelqu'un qui veut entendre « je suis fiable ». |
| **Dark mode** | Tu vends de la couleur et de la lumière. |
| **Badges « 8 personnes regardent ce produit »** | Sur du sur-mesure décennal, c'est absurde et ça se voit. |
| **Avis avec photos non modérés** | 🔒 **Rupture du blind-shipping.** Un carton fournisseur dans une photo client, et c'est fini. |
| **Métadonnées EXIF non nettoyées** | 🔒 Idem, en pire : invisible, indexable, permanent. |
| **JSON-LD avec `brand` ou `manufacturer` externes** | 🔒 Idem. Personne ne l'audite jamais. |
| **Un « suivi de colis » qui redirige vers un transporteur nommant l'expéditeur** | 🔒 Le maillon le plus faible de toute la chaîne blind-shipping. À vérifier **avant** la refonte visuelle. |

---

## 6. BUDGET PERF

### Cibles (terrain, 75e percentile, mobile 4G, Moto G mid-range)

| Métrique | Seuil Google | Cible aimetapiscine | Justification |
|---|---|---|---|
| **LCP** | < 2,5 s | **< 2,0 s** | **[M]** [Vodafone : LCP −31 % → +8 % de ventes. Rakuten 24 : CWV optimisés → +53 % de revenu par visiteur, +33 % de conversion](https://adfinite.com/blog/shopify-core-web-vitals-inp). |
| **INP** | < 200 ms | **< 150 ms** | INP mesure **toutes** les interactions, pas la première. Ton calculateur est une machine à INP. |
| **CLS** | < 0,1 | **< 0,05** | Le prix qui bouge = confiance qui part. |
| **JS first-load (route homepage)** | — | **< 130 KB gzip** | Baseline App Router ≈ 90 KB. Reste **~40 KB pour tout le reste**. |
| **JS first-load (route PDP)** | — | **< 160 KB gzip** | Le calculateur mérite les 30 KB supplémentaires. |

### Coût de la direction retenue

| Élément | Coût | Décision |
|---|---|---|
| Reveals + stagger au scroll | **0 KB** | CSS `animation-timeline: view()` sous `@supports`. Firefox → statique, illisible pour personne. |
| Buy-box sticky, galerie sticky | **0 KB** | `position: sticky`. |
| Swatches (hero + PDP) | **~1 KB** | Client Component minimal, `useState` local. Images préchargées via `<link rel="preload">` sur les 2 premiers coloris uniquement. |
| ATC drawer mobile | **~1,5 KB** | `IntersectionObserver` + un `<dialog>` natif. |
| Calculateur | déjà là | ⚠️ À isoler en Client Component **feuille**, chargé en `next/dynamic` avec `ssr: false` **uniquement sur la homepage** (le teaser). Sur le PDP il doit être SSR pour le SEO du prix. |
| View Transitions | **0 KB de lib** | Flag Next.js + CSS. Zéro dépendance. |
| **Total lib d'animation** | **0 KB** | **Ni GSAP, ni Motion, ni Lenis.** |

### La décision que tu n'attendais pas : zéro librairie d'animation

**[O]** Voilà pourquoi.

- **GSAP** est gratuit depuis avril 2025 (Webflow), plugins inclus. Core ~23 KB + ScrollTrigger ~7 KB gzip. Mais il est [closed-source, la licence interdit l'usage dans un concurrent de Webflow, et Webflow peut la résilier](https://motion.dev/docs/gsap-vs-motion). Sur un projet solo à horizon 5 ans, c'est une dépendance politique.
- **Motion** est MIT, irrévocable. ~30 KB gzip complet, [descendable à ~4,6 KB au premier rendu via `LazyMotion` + `m`](https://motion.dev/docs/react-reduce-bundle-size). Excellent — pour un produit qui a besoin de layout animations et d'`AnimatePresence`.
- **Toi, tu n'en as besoin d'aucun des deux.** Ta liste d'animations, après la §B3, tient en : reveal, stagger, crossfade, sticky. Les quatre sont natifs. Payer 30 KB de JS et du temps sur le thread principal pour du `opacity: 0 → 1`, c'est acheter du LCP dégradé au prix fort.

**La contrepartie honnête :** si un jour tu veux du scroll-telling séquencé sur une page « Comment on découpe votre liner », GSAP + ScrollTrigger reste l'outil, et rien d'autre. Alors : **charge-le en `next/dynamic` sur cette route seule**, jamais dans le layout racine. Budget alloué : 35 KB, sur une page qui n'est ni la homepage ni le PDP.

### Ce qui ne tient pas dans le budget, et l'alternative

| Envie | Coût réel | Verdict | Alternative |
|---|---|---|---|
| Hero vidéo bassin | 2–4 MB, LCP > 3 s | ❌ | Une photo AVIF à 90 KB, `fetchpriority="high"`. |
| Simulateur 3D | 400 KB+ (three.js), INP catastrophique sur mobile | ❌ (et parké) | Schéma SVG coté (2 KB) + photo par coloris. |
| Scroll smoothing (Lenis/ScrollSmoother) | 15 KB + scrolljacking | ❌ | Rien. Le scroll natif est parfait. |
| Kinetic typography au scroll | GSAP SplitText, ~4 KB + reflows | ❌ | Une bonne échelle typographique. |
| View Transitions sur toutes les routes | 0 KB, mais [freeze pendant le streaming RSC](https://www.72technologies.com/blog/view-transitions-nextjs-app-router-guide) | ⚠️ | Uniquement `catalogue → produit`, avec `router.prefetch()` au `onMouseEnter`. |

---

# SPEC PROPOSÉE — 5 chantiers, dans l'ordre

> Chaque chantier = un cycle de ta méthode : Claude Code implémente → tu testes → revue → commit + push + `/clear`.
> Chantier 0 implicite : **sortir le projet de OneDrive** avant de toucher au moindre fichier. Ce n'est pas négociable et ça te coûtera une soirée de débogage fantôme sinon.

---

### Chantier 1 — Audit & étanchéité blind-shipping du front public
**Périmètre.** Avant d'ajouter une seule pixel. Pipeline de strip EXIF/IPTC/XMP sur tout upload Supabase Storage. Denylist serveur (tokens fournisseur) appliquée aux avis, noms de fichiers, alt-text, et payload JSON-LD. Vérification du lien de suivi transporteur. Test Vitest dédié par vecteur.
**Done.** Une suite `blind-shipping.spec.ts` couvre 6 vecteurs (image binaire, nom de fichier, alt, avis texte, JSON-LD, URL de suivi). Elle passe. Un fichier d'image piégée (métadonnée fournisseur injectée) fait échouer le build si le strip est retiré.

---

### Chantier 2 — Design system « Nuancier » + tokens
**Périmètre.** Palette (6 hex), 3 familles typographiques, échelle `clamp()`, espacements, `prefers-reduced-motion` global, `@supports (animation-timeline: view())` avec état révélé par défaut. Composants primitifs : `Swatch`, `PriceBlock`, `SpecTable`, `CollapsibleSection`, `StickyBuyBox`. **Zéro librairie d'animation ajoutée au `package.json`.**
**Done.** Storybook (ou une route `/_design`) montre les 5 primitives. Le contraste de chaque paire texte/fond passe AA. Une page de test avec `prefers-reduced-motion: reduce` forcé affiche 100 % du contenu, 0 % du mouvement. `next build` : first-load JS partagé inchangé (±2 KB).

---

### Chantier 3 — Page produit
**Périmètre.** Backlog #1, #2, #3, #5, #6, #7, #8, #9, #10, #14. Calculateur **inline** dans la buy-box (refactor, pas réécriture — le moteur de calcul ne bouge pas d'une ligne). Coût total estimé via la fonction unique de prix. Sections verticales, jamais d'onglets. Galerie complète, zoom, pinch.
**Done.** Sur `/produits/[slug]` : le prix au m² et le total estimé (produit + port) sont visibles sans scroll sur desktop et dans le drawer sur mobile. Aucune vignette n'est tronquée. Aucun `<select>` pour un coloris. Le bouton ATC est actif au chargement. Lighthouse mobile : LCP < 2,0 s, CLS < 0,05, INP < 150 ms sur le remplissage du calculateur. First-load JS de la route < 160 KB.

---

### Chantier 4 — Homepage
**Périmètre.** Les 10 sections du wireframe §1. Hero à swatches (signature). Teaser calculateur 3 champs qui pré-remplit et ouvre le calculateur expert à l'étape 2. Nuancier. Bento technique. Bandeau pro. FAQ inline + JSON-LD `FAQPage`. `llms.txt`.
**Done.** La homepage n'a **aucune animation au-dessus de la ligne de flottaison**. LCP < 1,8 s sur mobile 4G simulé. Le teaser calculateur produit un prix estimé en < 100 ms après le 3e champ. First-load JS < 130 KB. Le JSON-LD valide au Rich Results Test et ne contient aucun `brand` / `manufacturer` / `seller` externe.

---

### Chantier 5 — Preuve sociale & finition
**Périmètre.** Backlog #11, #12, #13 (déjà partiellement fait en chantier 1), #16, #18, #19, #21, puis #20 en dernier. Avis avec photos navigables entre avis, réponses marque stylées, wishlist/devis invité partageable, schéma SVG coté, checklist de pose → pack. Reveals CSS. View Transitions catalogue → produit, avec `router.prefetch()` au hover et un `loading.tsx` de même géométrie.
**Done.** Un avis avec photo passe par la modération a priori avant publication. Le carrousel de photos clients traverse les avis. Le lien de devis invité est ouvrable dans un autre navigateur et restaure le panier. Firefox stable affiche la page sans reveals **et sans contenu manquant**. La transition catalogue → produit ne provoque aucun freeze > 100 ms (mesuré avec un Server Component ralenti artificiellement à 800 ms).

---

## Annexe — sources principales

**Recherche UX mesurée**
- Baymard Institute — [Product Page UX 2026 : 10 pièges et bonnes pratiques](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
- Baymard — [50 statistiques d'abandon de panier 2026](https://baymard.com/lists/cart-abandonment-rate)
- Baymard — [Onglets horizontaux : 27 % du contenu raté](https://growrevenue.io/avoid-horizontal-tabs/) · [article source](https://baymard.com/blog/avoid-horizontal-tabs)
- Baymard — [Structurer par highlights](https://baymard.com/blog/structure-descriptions-by-highlights) · [Vignettes tronquées](https://baymard.com/blog/truncating-product-gallery-thumbnails) · [Images en mode paysage](https://baymard.com/blog/scale-mobile-product-images-in-landscape)
- Baymard — [Product List UX 2025](https://baymard.com/blog/current-state-product-list-and-filtering)
- Nielsen Norman Group — [Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/) · [Scroll Fading 101](https://www.nngroup.com/articles/scroll-fading-101/)

**A/B tests**
- Growth Rock — [Sticky Add to Cart : résultats A/B réels](https://growrevenue.io/sticky-add-to-cart-button/) et [réplication mobile](https://growthrock.co/sticky-add-to-cart-button-example/)
- Traction Marketing — [+2,74 %, non significatif](https://tractionmarketing.nz/insights/unlocking-small-wins-that-scale-what-we-learned-from-testing-a-sticky-add-to-cart-button-on-mobile/)

**Performance**
- Google — [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Vodafone, Rakuten 24, Deloitte/Google « Milliseconds Make Millions »](https://adfinite.com/blog/shopify-core-web-vitals-inp)

**Technique**
- Next.js — [`viewTransition`](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) · [guide View Transitions](https://nextjs.org/docs/app/guides/view-transitions)
- [Pièges des View Transitions avec le streaming RSC](https://www.72technologies.com/blog/view-transitions-nextjs-app-router-guide)
- MDN — [`animation-timeline` (non Baseline)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline) · [Guide scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [État réel du support scroll-driven en 2026](https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026)
- WebKit — [Scroll-driven animations en CSS pur](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/)
- Webflow — [GSAP devient 100 % gratuit](https://webflow.com/updates/gsap-becomes-free) · [GSAP 3.13](https://gsap.com/blog/3-13/)
- Motion — [GSAP vs Motion, licences et bundle](https://motion.dev/docs/gsap-vs-motion) · [Réduire le bundle (LazyMotion, 4,6 KB)](https://motion.dev/docs/react-reduce-bundle-size)

**Design & tendances**
- Awwwards — [Annual Awards 2025](https://www.awwwards.com/annual-awards-2025/) · [E-commerce of the Year 2025](https://www.awwwards.com/annual-awards-2025/ecommerce-site-of-the-year) · [Sites of the Year](https://www.awwwards.com/inspiration_search/sites_of_the_year/)
- StudioMeyer — [Tendances 2026 : bilan à 6 mois](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check)
- [Où l'anti-design fonctionne et où il échoue](https://www.itsbuzzinteractive.com/blog/top-web-design-trends)

**Concurrence**
- [RENOLIT Alkorplan — configurateur](https://renolit-alkorplan.com/fr/configurateur) · [gamme Vogue](https://www.renolit.com/fr/industries/maison-et-batiment/environnement/piscines/renolit-alkorplan-vogue)
