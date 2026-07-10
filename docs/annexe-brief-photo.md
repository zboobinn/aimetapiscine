# Annexe — Brief photo

**Prérequis bloquant des specs 29 et 30.**
Ce n'est pas du code. C'est le chemin critique. Le design system (28) se fait sans assets ; la page produit, non.

---

## Les 4 plans obligatoires, par coloris

| # | Plan | Ce qu'il résout | Contrainte |
|---|---|---|---|
| 1 | **Macro matière** | Le grain, le relief (3D Touch), le vernis | ≥ 2000 px de large. Zoomable. Lumière rasante pour révéler le relief. |
| 2 | **Le bassin rempli** | *La couleur de l'eau.* C'est ça qu'on achète. | Lumière naturelle du sud, fin d'après-midi. Jamais de studio. |
| 3 | **Échelle** | L'angoisse de dimension, résolue visuellement | La membrane avec un mètre déplié posé dessus, ou une main. **[Mesuré]** 42 % des utilisateurs déduisent la taille depuis les photos ; 37 % des sites ne fournissent aucune image à l'échelle. |
| 4 | **Soudure / raccord** | Le doute technique n°1 sur une membrane armée | Gros plan net sur un raccord propre. |

**Un coloris sans ses 4 plans ne se publie pas.** Contrainte en base : `CHECK (jsonb_array_length(images) >= 4)`.

---

## Direction photo « Nuancier »

- Lumière naturelle. Ombres dures. Contraste réel.
- **Interdiction absolue :** le rouleau de PVC sur fond blanc. Ça ne vend rien, et c'est ce que fait toute la concurrence.
- Pas de studio, pas de flat-lay, pas de dégradé de fond.
- Le matériau se photographie comme une matière, pas comme un produit.

---

## Le libellé qui accompagne chaque coloris

Champ `water_appearance` dans la table `products`. Une phrase, ce format exact :

> **Sable** — la membrane est beige clair. **L'eau paraît turquoise.**

C'est la seule phrase qui compte. Les gens n'achètent pas une membrane beige, ils achètent une eau turquoise. Renolit l'a compris et le communique ; aucun revendeur français ne le fait.

---

## Photos clients

- **Accord écrit obligatoire**, archivé, avant toute publication.
- Zéro colis, zéro carton, zéro étiquette dans le cadre. C'est une clause du formulaire de consentement, pas une consigne de modération *a posteriori*.
- Toutes passent par le pipeline `sanitize()` de la spec 27 : EXIF supprimé, nom de fichier réécrit.

---

## Checklist avant de rouvrir la spec 29

- [ ] 4 plans × N coloris, livrés en RAW ou en JPEG qualité maximale
- [ ] Aucune métadonnée fournisseur dans les fichiers sources *(sera de toute façon strippée, mais on veut le savoir)*
- [ ] `water_appearance` rédigé pour chaque coloris
- [ ] Photos clients : consentements signés et archivés
- [ ] Nommage source : `{coloris}-{plan}.jpg`, plan ∈ `macro | bassin | echelle | soudure`
