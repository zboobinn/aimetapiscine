# Spec 29 — Page produit

**Statut :** bloqué sur assets photo (voir `docs/annexe-brief-photo.md`)
**Dépend de :** 27, 28
**Bloque :** 30 (partiellement — le teaser calculateur réutilise le composant)
**Effort estimé :** 2 à 3 sessions

---

## Le principe qui gouverne toute la page

> Le calculateur **modifie** un prix déjà affiché. Il ne le révèle pas.

Conséquences non négociables :
- La page arrive avec un prix, calculé côté serveur sur une dimension médiane (**8,00 × 4,00 × 1,50 m**, hard-codé dans un constant nommé `DEFAULT_POOL_DIMENSIONS`).
- Le bouton « Ajouter au panier » est **actif au chargement**, avec ces cotes par défaut.
- Il ne dit jamais « Configurez d'abord ». Un bouton grisé est un mur ; un prix qui se précise est un escalier.

Le moteur de calcul existant **ne bouge pas d'une ligne**. Cette spec le déplace et l'habille. Si Claude Code propose de le réécrire, refuser.

---

## Structure de la page

```
Fil d'Ariane
├─ Colonne gauche (sticky)        ├─ Colonne droite (buy-box, sticky)
│  Image principale, zoomable     │  Titre + note + nb d'avis
│  TOUTES les vignettes visibles  │  Swatches coloris (boutons)
│  4 plans obligatoires :         │  ○ Je connais mes cotes
│   1. macro matière              │  ● Aidez-moi à mesurer  ← défaut
│   2. bassin rempli              │  Calculateur inline
│   3. échelle (mètre + main)     │  ─────────────────────────
│   4. soudure / raccord          │  Surface     46,4 m²
│                                 │  Prix / m²   26,72 € TTC
│                                 │  Membrane  1 240,00 € TTC
│                                 │  Livraison     +49,00 €
│                                 │  ═════════════════════════
│                                 │  TOTAL     1 289,00 € TTC
│                                 │  [ AJOUTER AU PANIER ]
│                                 │  ✓ Garantie 10 ans
│                                 │  ✓ Découpe sur mesure → Retours
│                                 │  ✓ Expédié sous 10 j ouvrés

Highlights (image + titre + paragraphe) × 5
Fiche technique (tableau, pas de PDF)
Pose
Entretien
Avis
« Pour poser ce liner, il vous faudra aussi » → pack + remise
FAQ inline
```

---

## Périmètre

### 1. Buy-box sticky (desktop)

`position: sticky`. Zéro JS. **[Mesuré]** +7,9 % de commandes, 99 % de significativité ([Growth Rock](https://growrevenue.io/sticky-add-to-cart-button/)).

### 2. ATC drawer persistant (mobile)

Bouton fixe en bas. Au tap, un `<dialog>` natif remonte avec : coloris, cotes, prix, valider.
**[Mesuré]** La variante « drawer » bat la variante « scroll vers le bloc d'achat » : +6,5 % de commandes (97 %), +11,8 % de clics ATC.
`padding-bottom` du `<main>` = hauteur du bouton fixe, sinon le dernier bloc est masqué.

### 3. Calculateur inline

- Refactor du calculateur expert en **Client Component feuille**, importé directement (pas de `next/dynamic` ici — le PDP a besoin du prix en SSR pour le SEO).
- Deux modes, radio : « Je connais mes cotes » (champs directs) / « Aidez-moi à mesurer » (défaut, séquence guidée).
- Lien « Comment mesurer » → panneau latéral, 4 schémas, une phrase par cote. **Ne quitte pas la page.**
- Budget INP : le recalcul doit rendre en **< 100 ms** après la dernière frappe. Debounce 150 ms, calcul synchrone, pas d'appel réseau.

### 4. Prix — la règle la plus importante

Toutes les valeurs affichées passent par **la fonction unique de calcul de prix**. Quatre lectures, une source :

| Affichage | Source |
|---|---|
| Prix au m² | `computePrice().pricePerSqm` |
| Sous-total membrane | `computePrice().subtotalTTC` |
| Livraison estimée | `computeShipping()` — logique existante, surcharge Corse incluse |
| Total estimé | `computePrice().totalTTC` |

**[Mesuré]** 39 % des abandons de panier viennent des frais annexes ; 67 % des sites n'affichent aucun total près du bloc d'achat ; 81 % n'affichent pas de prix à l'unité ([Baymard](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).

Le prix au m² n'est pas décoratif : c'est le seul chiffre qui permet à un pisciniste pro de comparer ton offre. Il est obligatoire.

### 5. Galerie

- **Toutes** les vignettes visibles, jamais tronquées. **[Mesuré]** Tronquer fait rater 50 à 80 % des images ([Baymard](https://baymard.com/blog/truncating-product-gallery-thumbnails)).
- Vignettes sur mobile aussi (76 % des sites mobiles n'en ont pas).
- Pinch-zoom et tap-to-zoom sur mobile (40 % des sites n'en ont pas).
- Image principale : `next/image`, `priority`, AVIF, `sizes` correct. C'est l'élément LCP de la route.
- Les 4 plans par coloris sont **obligatoires**. Un coloris qui n'a pas ses 4 plans ne se publie pas. Contrainte au niveau de la base : `CHECK (jsonb_array_length(images) >= 4)`.

### 6. Swatches

Boutons, jamais un `<select>`. **[Mesuré]** 57 % des sites se trompent là-dessus.

Chaque swatch porte son nom, et la page affiche la phrase qui décide de l'achat :

> **Sable** — la membrane est beige clair. **L'eau paraît turquoise.**

Champ `water_appearance` à ajouter dans la table `products`. Les gens n'achètent pas une membrane beige.

### 7. Contenu long

- **Sections verticalement repliables** (`<details>`), jamais d'onglets horizontaux. **[Mesuré]** 27 % ratent le contenu en onglets, contre 8 % en sections verticales ([Baymard](https://growrevenue.io/avoid-horizontal-tabs/)).
- Description **structurée par highlights** : 5 blocs image + titre + paragraphe (armature, vernis, épaisseur, pose, garantie). **[Mesuré]** 78 % des sites ne le font pas ([Baymard](https://baymard.com/blog/structure-descriptions-by-highlights)).
- Le contenu des `<details>` est dans le DOM au rendu serveur. Indexable.

### 8. Réassurance

- Lien vers la politique de retour **depuis le PDP**. **[Mesuré]** 60 % des utilisateurs l'y cherchent ; 44 % des sites ne l'y mettent pas.
- **Garantie de reprise sur erreur de cote** : câblée derrière `NEXT_PUBLIC_REMAKE_GUARANTEE` (`'off' | 'material-only' | 'full'`).
  - `off` (défaut) : « Découpe sur mesure — non repris. »
  - `material-only` : « Erreur de cote ? On refait, vous payez la matière. »
  - `full` : « Erreur de cote ? On refait. »
  - **Décision commerciale en attente auprès du fournisseur.** Le front fonctionne dans les trois cas. Rappel : variable `NEXT_PUBLIC_*` → accès en **littéral** dans le composant client, sans passer par Zod ni par une fonction.

### 9. Upsell

En bas de page. Jamais dans la buy-box. Formulé en **checklist de chantier** :

> Pour poser ce liner, il vous faudra aussi :
> ☐ Colle PVC (non inclus)
> ☐ Profilé de finition (non inclus)

Chaque item porte explicitement « non inclus ». **[Mesuré]** 44 % des sites ne clarifient pas inclus / en supplément — source d'appels SAV massive sur une membrane armée.
Se branche sur le système de packs existant : la checklist cochée devient un pack, le pack déclenche la remise, la remise est le seul argument affiché.

### Hors périmètre

- Avis clients (spec 31).
- Wishlist / devis (spec 31).
- Schéma SVG coté (spec 31).
- View Transitions (spec 31).
- Toute réécriture du moteur de calcul.

---

## Critère de done

- [ ] Sur `/produits/[slug]`, desktop : prix au m² **et** total estimé (membrane + livraison) visibles **sans scroll**.
- [ ] Sur mobile : le drawer ATC contient les mêmes chiffres. Le dernier bloc de la page n'est pas masqué par le bouton fixe.
- [ ] Aucune vignette tronquée, aucune indication « +3 photos ».
- [ ] Aucun `<select>` pour un coloris. Aucun onglet horizontal sur la page.
- [ ] Le bouton ATC est actif au chargement, avec les cotes par défaut, et ajoute réellement au panier.
- [ ] Les 4 chiffres du bloc prix proviennent tous d'appels à la fonction unique. Vérifié par un test qui mock la fonction et assert que les 4 valeurs bougent ensemble.
- [ ] Lighthouse mobile, throttling 4G, sur un PDP réel : **LCP < 2,0 s · CLS < 0,05**.
- [ ] INP mesuré sur le remplissage complet du calculateur : **< 150 ms** au pire.
- [ ] First-load JS de la route : **< 160 KB gzip**.
- [ ] `NEXT_PUBLIC_REMAKE_GUARANTEE=off|material-only|full` change le texte de réassurance sans rebuild du composant. Les trois valeurs testées.
- [ ] Test blind-shipping (spec 27) : le JSON-LD du PDP ne contient ni `manufacturer`, ni `brand` externe. Assert dans un test d'intégration de route.

---

## Prérequis bloquant

Les assets photo. Voir `docs/annexe-brief-photo.md`.
Sans les 4 plans par coloris, cette spec ne peut pas être terminée — seulement câblée avec des placeholders. **Ne pas la fermer sur des placeholders.**
