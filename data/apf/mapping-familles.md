# Dictionnaire de correspondance — familles APF → identité façade ArmaPool

Version corrigée après arbitrages Léo.

Décisions actées :
- **A** sur Alkorplan : publié sous nom générique ArmaPool (voir garde ci-dessous).
- Largeur 1,65 / 2,05 m = **variante d'un même produit**, pas produit distinct.
- « Hung » → **« profilé »**.
- Leister / Weld'Air → **hors V1** (non-publié).
- 3D Sensation ≠ 3D Touch → **deux produits**.
- Décors (Alive / Evolve / Vogue) → **noms à inventer sur visuels** → parkés
  « sur devis », comme A3.

Tokens interdits en façade : HYDROFLEX, ALKORPLAN, RENOLIT, POOL DESIGN, APF.

Colonnes : `nom_armapool` (affiché) · `base_slug` · `type`
(membrane | pvc-liquide | accessoire | outillage | entete | non-publié) ·
`unite` (m2 | ml | unite) · `note`.

---

## ⚠️ GARDE — Alkorplan publié mais sous condition (décision A)

Le mapping règle le blind-shipping TEXTUEL. Il ne règle PAS le risque PHYSIQUE
(marquage fabricant dans le lé au déballage client) — c'est une sous-question
APF sans réponse. Donc, pour toute famille marquée `⚠️ flag` : préparer, seeder,
mais garder en statut **brouillon / masqué** derrière un flag jusqu'à
confirmation écrite d'APF sur l'absence de marquage physique. Ne pas publier à
chaud.

## ⚠️ Règle variante-par-largeur (décision 2)

Une gamme existant en 1,65 m ET 2,05 m = **un seul produit façade, deux
variantes de largeur**. Le `ref_apf` est porté par la VARIANTE (gamme × largeur),
pas par le produit. Conséquences : sélecteur largeur sur la PDP, et le
calculateur intègre la largeur du rouleau (nb de rouleaux + recouvrement 5 cm).
Marqué `↔ largeur` ci-dessous.

---

## Membranes — gamme maison (Hydroflex)

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 1 | PVC ARME APF POOL DESIGN HYDROFLEX | — | — | entete | — | En-tête, ignorer au seed. |
| 2 | HYDROFLEX NATIVE STANDARD 1,65m | Membrane armée 150/100 — lisse | membrane-150-lisse | membrane | m2 | ↔ largeur (avec #3). |
| 3 | HYDROFLEX NATIVE STANDARD 2,05m | *(variante 2,05 de #2)* | membrane-150-lisse | membrane | m2 | ↔ largeur : fusionne avec #2. |
| 4 | HYDROFLEX NATIVE VERNI 1,65m | Membrane armée 150/100 — vernie | membrane-150-vernie | membrane | m2 | ↔ largeur (avec #5). Vernis anti-UV / anti-algues. |
| 5 | HYDROFLEX NATIVE VERNI 2,05m | *(variante 2,05 de #4)* | membrane-150-vernie | membrane | m2 | ↔ largeur : fusionne avec #4. |
| 6 | HYDROFLEX ANTIDERAPANT 1,65m | Membrane armée 150/100 — antidérapante | membrane-150-antiderapante | membrane | m2 | Plages / escaliers / pente douce. |
| 7 | HYDROFLEX 3D SENSATION 1,65m | Membrane armée 150/100 — relief | membrane-150-relief | membrane | m2 | Produit distinct de #20 (décision 5). |
| 8 | HYDROFLEX 4D PERCEPTION 1,65m | Membrane armée 150/100 — grand relief | membrane-150-grand-relief | membrane | m2 | « grand relief » pour différencier de #7 sans jargon. |

## PVC liquides — gamme maison

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 9 | PVC LIQUIDES APF POOL DESIGN HYDROFLEX | — | — | entete | — | Ignorer au seed. |
| 10 | PVC LIQUIDE HYDROFLEX | PVC liquide d'étanchéité | pvc-liquide | pvc-liquide | unite | Coloris accordé à la membrane. Flacon (vérifier contenance par réf). |

## Membranes — Alkorplan Renolit ⚠️ flag (brouillon jusqu'à réponse APF)

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 11 | PVC ARME ALKORPLAN RENOLIT | — | — | entete | — | Ignorer au seed. |
| 12 | ALKORPLAN RENOLIT 1000 | Membrane armée 150/100 — essentielle | membrane-essentielle-150 | membrane | m2 | ⚠️ flag. Entrée de gamme. |
| 13 | ALKORPLAN RENOLIT 2000 1,65m | Membrane armée 150/100 — confort | membrane-confort-150 | membrane | m2 | ⚠️ flag. ↔ largeur (avec #14). |
| 14 | ALKORPLAN RENOLIT 2000 2,05m | *(variante 2,05 de #13)* | membrane-confort-150 | membrane | m2 | ⚠️ flag. ↔ largeur : fusionne avec #13. |
| 15 | ALKORPLAN RENOLIT 3000 | Membrane armée 150/100 — premium | membrane-premium-150 | membrane | m2 | ⚠️ flag. Haut de gamme lisse. |
| 16 | ALKORPLAN ANTIDERAPANT RELIEF | Membrane armée 150/100 — antidérapante relief | membrane-antiderapante-relief | membrane | m2 | ⚠️ flag. |
| 17 | ALKORPLAN RENOLIT XTREME 1,65m | Membrane armée 150/100 — renforcée | membrane-renforcee-150 | membrane | m2 | ⚠️ flag. ↔ largeur (avec #18). « Xtreme » réécrit. |
| 18 | ALKORPLAN RENOLIT XTREME 2,05m | *(variante 2,05 de #17)* | membrane-renforcee-150 | membrane | m2 | ⚠️ flag. ↔ largeur : fusionne avec #17. |
| 19 | ALKORPLAN RENOLIT XTREME ANTIDERAPANT 10m x 1,65m | Membrane armée 150/100 — renforcée antidérapante | membrane-renforcee-antiderapante | membrane | m2 | ⚠️ flag. ⚠️ rouleau 10 m (pas 25) → conditionnement distinct à répercuter (calculateur + stock). |
| 20 | ALKORPLAN RENOLIT 3D TOUCH | Membrane armée 150/100 — relief structuré | membrane-relief-structure | membrane | m2 | ⚠️ flag. Produit distinct de #7 (décision 5). |
| 21 | ALKORPLAN RENOLIT ALIVE | *(décor — nom à inventer sur visuel)* | — | non-publié | m2 | ⚠️ PARKÉ. Sur devis / hors seed jusqu'aux visuels. |
| 22 | ALKORPLAN RENOLIT EVOLVE | *(décor — nom à inventer sur visuel)* | — | non-publié | m2 | ⚠️ PARKÉ. |
| 23 | ALKORPLAN RENOLIT NACRE | Membrane armée 150/100 — nacrée | membrane-nacree | membrane | m2 | ⚠️ flag. « nacrée » descriptif, OK. |
| 24 | ALKORPLAN RENOLIT VOGUE | *(décor — nom à inventer sur visuel)* | — | non-publié | m2 | ⚠️ PARKÉ. |

## PVC liquide — Alkorplan (doublon d'en-tête fusionné)

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 25 | PVC LIQUIDE ALKORPLAN RENOLIT | PVC liquide d'étanchéité — série 2 | pvc-liquide-s2 | pvc-liquide | unite | ⚠️ flag. Flacon 900 g. Coloris accordés (dont teintes décor Alive). |
| 26 | *(doublon vide de #25)* | — | — | entete | — | Confirmé doublon d'en-tête (aucun produit propre). Fusionner dans #25 à l'étape 3. |

## Accessoires de pose

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 27 | ACCESSOIRES pour la POSE | — | — | entete | — | Ignorer au seed. |
| 28 | HUNG PVC HORIZONTAL | Profilé de finition PVC — horizontal | profile-pvc-horizontal | accessoire | ml | |
| 29 | HUNG ALU HORIZONTAL | Profilé de finition alu — horizontal | profile-alu-horizontal | accessoire | ml | |
| 30 | HUNG ALU VERTICAL | Profilé de finition alu — vertical | profile-alu-vertical | accessoire | ml | |
| 31 | HUNG PVC VERTICAL | Profilé de finition PVC — vertical | profile-pvc-vertical | accessoire | ml | |
| 32 | STOP OUT - JONC de BLOCAGE | Jonc de blocage | jonc-blocage | accessoire | ml | « Stop Out » réécrit. |
| 33 | FEUTRES et MOUSSES | Feutre géotextile | feutre-geotextile | accessoire | m2 | Pose conditionnelle (décision poseur). |
| 34 | COLLES et AEROSOLS | Colle et aérosols de pose | colle-aerosol | accessoire | unite | Unité portée par chaque ligne (parse OK). |
| 35 | MASTIC COLLE | Mastic-colle | mastic-colle | accessoire | unite | Finitions / pièces à sceller. |
| 36 | ACCESSOIRES de POSE PVC ARME | *(famille PRODUCTIVE — mapping par réf, voir bloc dédié ci-dessous)* | — | multi | — | ⚠️ 29 réfs hétérogènes sous un même en-tête. Mapping au niveau RÉFÉRENCE, pas famille. |

### Bloc #36 — mapping par référence (29 lignes)

Cette famille ne se mappe pas par cœur de nom (un seul en-tête pour des produits
sans rapport). Le script doit apparier ces 29 réfs par `ref_apf` explicite. Colle
= factorisée par conditionnement ; Bostik = marque tierce AFFICHÉE ; tokens
denylist (HYDROFLEX, ALKORPLAN, ALKORGLUE, ALKORPLUS, ALKORCHEM, ALKORCLEAN,
APF, POOL DESIGN, HYDROGLUE) = RÉÉCRITS.

| réf_apf | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|
| D41614FA | Flacon applicateur PVC liquide | flacon-applicateur | accessoire | unite | |
| D41612B | Bandelette de soudure 9 mm | bandelette-soudure | accessoire | ml | Rouleau 25 m. |
| D41626B | Bandelette de soudure 9 mm — carton de 10 | bandelette-soudure | accessoire | unite | ⚠️ « Hydroflex » réécrit. Variante conditionnement carton. |
| D41612SO2 | Solvant de nettoyage THF | solvant | accessoire | unite | Flacon 1 L. |
| D41612SO3 | Solvant de nettoyage MEK | solvant | accessoire | unite | Pot 1 kg. |
| D41613RD1 | Rivets à frapper Ø4,8 × 26 mm | rivets | accessoire | unite | Boîte de 200. |
| D41614RD1 | Rivets à frapper Ø4,8 × 20 mm | rivets | accessoire | unite | Boîte de 250. |
| D41615TP | Tôle colaminée PVC | tole-colaminee | accessoire | m2 | 2 × 1 m, au m². |
| D41616TB | Tôle colaminée PVC — baguette coupée | tole-colaminee | accessoire | unite | Variante conditionnement. |
| D41616AR | Baguette d'angle rentrant 50 × 50 mm | baguette-angle | accessoire | unite | |
| D41616AS | Baguette d'angle sortant 50 × 50 mm | baguette-angle | accessoire | unite | |
| D41616AS2 | Baguette d'angle sortant 70 × 30 mm | baguette-angle | accessoire | unite | |
| D41616AS3 | Baguette d'angle PVC 90° 45 × 45 mm | baguette-angle | accessoire | unite | Baguette 2 m. |
| D41624A9 | Baguette PVC de finition | baguette-pvc | accessoire | ml | |
| D41622BA | Bande de soudure PVC armé | bande-soudure | accessoire | ml | 20 ml. |
| D41627BA | Bande de soudure PVC armé | bande-soudure | accessoire | ml | ⚠️ « HYDROFLEX » réécrit. 25 ml. |
| D41617CP | Colle PVC vinylique (Bostik Vinicol 170) | colle-pvc-vinylique | accessoire | unite | Bostik affiché. Pot 5 L. |
| D41618AL | Colle PVC de pose | colle-pvc-pose | accessoire | unite | ⚠️ « Alkorplan » réécrit. Pot 5 L. |
| D41623CN | Colle PVC de pose | colle-pvc-pose | accessoire | unite | ⚠️ « Alkorglue » réécrit. Pot 5 kg (variante). |
| D41625CA | Colle PVC de pose | colle-pvc-pose | accessoire | unite | ⚠️ « Alkorglue » réécrit. Pot 20 kg zéro solvant (variante). |
| D41628 | Colle thermo-adhésive sans acétone | colle-thermo | accessoire | unite | ⚠️ « APF Pool Design Hydro… » réécrit. |
| D41629 | Colle contact néoprène | colle-contact | accessoire | unite | ⚠️ « APF Pool Design Hydroglue » réécrit. |
| D41619CB | Colle Bostik 1220 (nitrile) | colle-bostik-1220 | accessoire | unite | Bostik affiché. Pot 1 L. |
| D41619CB2 | Colle Bostik 1220 (nitrile) | colle-bostik-1220 | accessoire | unite | Bostik affiché. Tube 125 ml (variante). |
| D41620CB | Colle Bostik 1400 (néoprène) | colle-bostik-1400 | accessoire | unite | Bostik affiché. Pot 1 L. |
| D41620CB2 | Colle Bostik 1400 (néoprène) | colle-bostik-1400 | accessoire | unite | Bostik affiché. Tube 125 ml (variante). |
| D34423AT | Produit antitaches | entretien-antitaches | accessoire | unite | ⚠️ « Alkorplus » réécrit. Flacon 1 L. |
| D34612AC | Prétraitement du support | entretien-pretraitement | accessoire | unite | ⚠️ « Alkorchem » réécrit. Flacon 1 L. |
| D41612AN1 | Nettoyant ligne d'eau | entretien-nettoyant | accessoire | unite | ⚠️ « Alkorclean » réécrit. Flacon 1 L. |

Résultat #36 : 17 produits façade (dont 4 colles multi-conditionnement, tôle,
bandelette, bande, rivets, baguette d'angle regroupent plusieurs réfs en
variantes). Aucun `entete`, aucune exclusion. Bostik reste littéral (marque
tierce, non-denylist).

## Outillage — hors V1 (décision 4)

| # | Famille brute | nom_armapool | base_slug | type | unité | note |
|---|---|---|---|---|---|---|
| 37 | LEISTER | — | — | non-publié | unite | Hors V1. Marque tierce. Exclure du seed. |
| 38 | WELD'AIR | — | — | non-publié | unite | Hors V1. Exclure du seed. |

---

## Récap pour l'étape 3 (script de fusion)

- **Seedées** : familles 2–8, 10, 12–20, 23, 25, 28–35 (membranes maison +
  Alkorplan flaggées + accessoires) **+ le bloc #36 mappé par référence**
  (17 produits accessoires supplémentaires).
- **Fusion largeur** : (2,3) (4,5) (13,14) (17,18) → un produit, deux variantes.
- **Fusion doublon** : 26 → 25.
- **#36 — mapping par RÉFÉRENCE** (pas par cœur de nom) : voir bloc dédié.
  Plusieurs réfs partagent un base_slug → variantes de conditionnement.
- **Exclues du seed** : en-têtes (1, 9, 11, 27, 26) · parkées décor
  (21, 22, 24) · hors V1 (37, 38). **#36 n'est plus exclue.**
- **Conditionnement découpe/sur-mesure : HORS V1.** Seul le rouleau est vendu.
  Lignes source « à la découpe » / « le ml » doublant un produit rouleau =
  exclues.
- **Statut brouillon/masqué** (flag Alkorplan) : 12–20, 23, 25. Le bloc #36 est
  en statut **publié** (accessoires génériques), SAUF si une colle réécrite
  d'origine Alkorplan te semble devoir suivre le même flag physique — à trancher.
- **Bostik** : littéral, jamais réécrit (marque tierce, hors denylist).
- **Reste à faire par Léo** : noms des 3 décors (attendent visuels) ;
  vérifier contenances flacons PVC liquide (familles 10, 25) au niveau ligne.
