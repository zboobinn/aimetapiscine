# Spec 28 — Design system « Nuancier »

**Statut :** à faire
**Dépend de :** 27
**Bloque :** 29, 30, 31
**Effort estimé :** 1 à 2 sessions

---

## Direction actée

**« Nuancier »** — éditorial matière. Le produit est un échantillon, le site est un présentoir.
Le registre secondaire **« Bureau d'études »** (mono, tableaux, filets, schémas cotés) est **un sous-registre typographique**, réservé aux zones de vérification : calculateur, fiche technique, tableaux de cotes. Ce n'est pas une alternative, ce n'est pas un thème.

Cette décision est prise. Elle ne se rediscute pas au milieu de la spec 30.

---

## Tokens

### Couleur

```css
:root {
  --ink:        #101314;  /* encre — texte, bordures fortes */
  --lime-wash:  #F2F3EF;  /* blanc de chaux — fond de page */
  --turquoise:  #3FB6A8;  /* la couleur de l'EAU. Jamais un accent d'UI. */
  --deep-blue:  #0E5C8A;  /* bleu profond — liens, focus */
  --coping:     #B6B3AA;  /* gris margelle — texte secondaire, filets */
  --signal:     #E8452B;  /* erreurs UNIQUEMENT. Jamais décoratif. */

  --surface:    #FFFFFF;  /* cartes, buy-box */
  --ink-60:     color-mix(in oklab, var(--ink) 60%, var(--lime-wash));
}
```

**Règles dures.**
- `--turquoise` ne sert jamais de couleur de bouton, de badge, ou de survol. C'est la couleur du produit. L'utiliser en UI la dévalue.
- Pas de dark mode. On vend de la lumière et de la couleur.
- Toute paire texte/fond passe AA (4.5:1 corps, 3:1 large). Vérifié, pas supposé — un test unitaire de contraste sur les paires autorisées.

### Typographie

Toutes en OFL, disponibles via `next/font/google`, donc self-hostées, donc zéro requête tierce et zéro CLS de police.

```ts
// app/fonts.ts
import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from 'next/font/google'

export const display = Bricolage_Grotesque({
  subsets: ['latin'], display: 'swap', variable: '--font-display',
})
export const body = Inter_Tight({
  subsets: ['latin'], display: 'swap', variable: '--font-body',
})
export const mono = JetBrains_Mono({
  subsets: ['latin'], display: 'swap', variable: '--font-mono',
})
```

| Rôle | Famille | Usage |
|---|---|---|
| Display | Bricolage Grotesque 700 | H1–H3 uniquement |
| Body | Inter Tight 400 / 500 | tout le reste |
| Mono | JetBrains Mono 400 | **nombres et métadonnées seulement** : cotes, m², prix, épaisseurs, références |

**La règle mono est stricte.** Un prix est en mono. Une phrase ne l'est jamais. C'est ce qui fait exister le sous-registre « Bureau d'études » sans changer de direction.

### Échelle

```css
:root {
  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0:  clamp(1rem, 0.96rem + 0.2vw, 1.0625rem);   /* 17px desktop */
  --step-1:  clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2:  clamp(1.55rem, 1.3rem + 1.2vw, 2.25rem);
  --step-3:  clamp(1.95rem, 1.4rem + 2.7vw, 3.5rem);
  --step-4:  clamp(2.5rem, 1.2rem + 6vw, 5rem);          /* H1 */

  --lh-tight: 1.05;
  --lh-body:  1.6;
  --tracking-display: -0.02em;
}
```

Corps à 17px. Interlignage 1.6. Les H1 en `--step-4`, `--lh-tight`, `--tracking-display`.

### Espacement & grille

```css
:root {
  --space-section: clamp(5rem, 10vw, 9rem);
  --space-block:   clamp(2rem, 4vw, 3.5rem);
  --gutter:        1.5rem;
  --measure:       68ch;   /* longueur de ligne max pour du texte courant */
  --page-max:      1360px;
}
```

12 colonnes desktop, gouttière 24px, `max-width: 1360px`. Les blocs matière **débordent en full-bleed** via une utilité `.bleed`.

### Rayons, ombres, filets

- `--radius: 2px`. Presque rien. On n'est ni chez Apple ni chez Gumroad.
- **Aucune ombre portée.** Séparation par filet `1px solid var(--coping)` ou par changement de fond.

---

## Motion

### Le socle

```css
/* État final = état par défaut. On anime DEPUIS lui, jamais VERS lui. */
.reveal { opacity: 1; transform: none; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 22%;
    }
  }
}

@keyframes reveal-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> ⚠️ `animation-timeline` **n'est pas Baseline** (Firefox stable le garde derrière un flag en 2026, ~82 % de support global). Le `@supports` n'est pas de la coquetterie : sur Firefox la page est statique et parfaitement lisible. C'est le comportement voulu.

### Ce qu'on n'anime pas

Le prix. Le résultat du calculateur. Le bouton « Ajouter au panier ». La navigation. Le contenu au-dessus de la ligne de flottaison. Les chiffres de réassurance. Le scroll lui-même. Les swatches (crossfade ≤ 120 ms, c'est tout).

### Le geste signature

**Le swatch.** Un clic sur une pastille de couleur change la photo du bassin. 120 ms de crossfade. C'est le seul mouvement mémorable du site, et il est répété partout : hero, nuancier, page produit.

---

## Primitives à livrer

| Composant | Type | Notes |
|---|---|---|
| `<Swatch />` | Client | Bouton, pas `<div>`. Porte le **nom** du coloris, pas seulement la couleur (a11y daltonisme). `aria-pressed`. |
| `<SwatchGroup />` | Client | `role="radiogroup"`. Navigation flèches. Précharge les 2 premières images via `<link rel="preload">`, pas plus. |
| `<PriceBlock />` | Server | Prix TTC, prix au m², total estimé. **Consomme exclusivement la fonction unique de calcul de prix.** `tabular-nums`. Aucune animation. |
| `<SpecTable />` | Server | Filets 1px, mono sur les valeurs, sans. sur les libellés. |
| `<CollapsibleSection />` | Server + `<details>` natif | **Jamais d'onglets horizontaux.** `<details name="pdp">` pour l'accordéon exclusif si voulu. Contenu dans le DOM au rendu → indexable. |
| `<StickyBuyBox />` | Server | `position: sticky; top: var(--header-h)`. Zéro JS. |
| `<Bleed />` | Server | Utilitaire full-bleed. |

---

## Critère de done

- [ ] Une route `/_design` (non indexée, `noindex`, désactivée en prod via env) affiche les 7 primitives.
- [ ] `package.json` : **aucune** dépendance d'animation ajoutée. Pas de `gsap`, pas de `motion`, pas de `framer-motion`, pas de `lenis`, pas de `aos`. Un test CI qui lit `package.json` et échoue si l'une de ces clés apparaît.
- [ ] Test unitaire de contraste : chaque paire texte/fond du design system passe AA.
- [ ] Avec `prefers-reduced-motion: reduce` forcé (DevTools → Rendering), `/_design` affiche **100 % du contenu et 0 % du mouvement**.
- [ ] Dans Firefox stable, `/_design` affiche 100 % du contenu, sans reveal, sans saut de mise en page.
- [ ] `next build` : le first-load JS partagé n'a pas bougé de plus de 2 KB par rapport au commit précédent. *(noter la valeur avant/après dans `decisions.md`)*
- [ ] Aucune police chargée depuis un domaine tiers (vérifier l'onglet Network).
- [ ] Aucun `box-shadow` dans le CSS livré.

---

## Piège connu

`next/font` inline les variables CSS sur un `<html className={...}>`. Rappel de la contrainte projet : les variables `NEXT_PUBLIC_*` doivent être accédées **en littéral** dans les fichiers client. Ne pas faire passer le flag `NEXT_PUBLIC_DESIGN_ROUTE_ENABLED` par Zod ou par une fonction — ça casse l'inlining, et la route `/_design` se retrouvera en prod.
