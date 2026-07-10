# Spec 27 — Étanchéité blind-shipping du front public

**Statut :** à faire
**Bloque :** 28, 29, 30, 31
**Dépend de :** rien
**Effort estimé :** 1 session

---

## Pourquoi cette spec existe

Les specs 1–17 ont sécurisé le blind-shipping sur les **sorties transactionnelles** : emails, PDF, métadonnées PDF, messages d'erreur d'API. Trois vecteurs restent ouverts, et ils s'ouvrent tous au moment précis où l'on ajoute du contenu visuel et social au site public.

| Vecteur | Statut avant cette spec | Gravité |
|---|---|---|
| Métadonnées EXIF / IPTC / XMP des images produit | ❌ non traité | Critique — invisible, indexable, permanent |
| Photos et textes d'avis clients | ❌ n'existe pas encore, mais 31 l'introduit | Critique — un carton fournisseur suffit |
| `brand` / `manufacturer` / `seller` dans le JSON-LD | ❌ non traité | Critique — machine-lisible, jamais audité |
| Nom de fichier des uploads | ❌ non traité | Élevé |
| `alt` des images | ❌ non traité | Élevé |
| URL de suivi transporteur | ⚠️ à vérifier | Critique — hors code |

**Règle d'or de cette spec : on écrit les tests avant l'implémentation.** Le test doit échouer si on retire la protection. Une protection sans test qui la garde est une protection qui sera retirée dans six mois par un refactor.

---

## Périmètre

### Dans le périmètre

1. **Helper de censure partagé** (`lib/blind-shipping.ts`)
   - Réutilise et généralise le helper existant de la spec 15 (enforcement sur les messages d'erreur).
   - Exporte : `containsForbiddenToken(input: string): boolean` et `assertBlindSafe(input: string, context: string): void`.
   - La denylist vit dans une **variable d'environnement serveur** (`BLIND_SHIPPING_DENYLIST`, tokens séparés par des virgules), jamais en dur dans le code, jamais dans un fichier commité. Raison : le code source est mirroré sur GitHub.
   - Normalisation avant comparaison : minuscules, suppression des accents, suppression des caractères non alphanumériques. `A.P.F.`, `a p f`, `A-P-F` doivent tous matcher.
   - ⚠️ Attention aux faux positifs : un token de 3 lettres matchera des mots légitimes. Utiliser des **frontières de mot**, pas de la substring brute. Ajouter un test dédié aux faux positifs (« apfelstrudel » ne doit pas matcher).

2. **Pipeline de nettoyage d'image** (`lib/images/sanitize.ts`)
   - Toute image, sans exception, passe par `sharp` avant écriture dans Supabase Storage.
   - `sharp` supprime les métadonnées par défaut. **Ne jamais appeler `.withMetadata()`.** Ajouter un commentaire explicite au-dessus du pipeline expliquant pourquoi.
   - Sortie normalisée : AVIF + WebP, deux largeurs (1600, 800), qualité 72.
   - Le **nom de fichier est réécrit** côté serveur : `{slug-produit}-{coloris}-{index}.{ext}`. Le nom d'origine n'est jamais persisté, jamais logué.
   - Rejet en erreur (code d'erreur standardisé de la spec 15) si `containsForbiddenToken` matche le nom d'origine — on ne veut pas juste renommer silencieusement, on veut savoir.

3. **Garde JSON-LD** (`lib/seo/product-jsonld.ts`)
   - Fonction unique de construction du JSON-LD produit.
   - `brand.name` et `seller.name` sont **codés en dur** sur `aimetapiscine`. Ces champs ne prennent aucun argument.
   - `manufacturer` n'existe pas dans le type de retour. Le type TypeScript doit rendre son ajout impossible sans modifier la fonction.
   - Sérialisation finale passée dans `assertBlindSafe()` avant injection dans le `<script type="application/ld+json">`.

4. **Garde sur les champs textuels publics**
   - `assertBlindSafe()` appelé sur : `alt` d'image, titre produit, description produit, nom de coloris, à la lecture depuis Supabase.
   - Comportement en cas de match : log serveur + rendu d'une chaîne de repli neutre. **Jamais de crash de page.** Un produit ne doit pas devenir invisible parce qu'un token traîne dans son `alt`.

5. **Vérification de l'URL de suivi transporteur** — tâche manuelle, pas du code
   - Ouvrir un lien de suivi réel en navigation privée.
   - Vérifier : nom de l'expéditeur, adresse de l'expéditeur, logo, référence de commande interne.
   - Si le transporteur expose l'expéditeur, ne pas lier le suivi. Afficher un statut interne alimenté par webhook.
   - **Consigner le résultat dans `decisions.md`, avec la date.**

### Hors périmètre

- Modération des avis (spec 31 — mais le helper construit ici y sera consommé).
- Nettoyage rétroactif des images déjà en Storage (voir « Migration » ci-dessous).
- Blind-shipping des emails et PDF (spec 17, déjà fait).

---

## Migration des assets existants

Un script `scripts/resanitize-storage.ts`, à exécuter une fois, qui :
1. liste tous les objets du bucket public,
2. relit chaque image, la repasse dans le pipeline,
3. écrit un rapport `resanitize-report.json` listant les fichiers dont les métadonnées contenaient quoi que ce soit.

Ne pas automatiser en CI. Une exécution manuelle, un rapport lu par un humain.

---

## Tests — `tests/blind-shipping.spec.ts`

Six vecteurs. Chacun doit échouer si sa protection est retirée.

| # | Test | Fixture |
|---|---|---|
| 1 | Une image dont l'EXIF `Copyright` contient un token interdit ressort sans aucune métadonnée | `tests/fixtures/tainted.jpg` — image générée par le test lui-même via `sharp().withMetadata({ exif: {...} })`, jamais commitée avec le token en clair |
| 2 | Un nom de fichier contenant un token est rejeté avec le bon code d'erreur | chaîne |
| 3 | `assertBlindSafe` sur un `alt` piégé retourne le repli, ne throw pas en rendu | chaîne |
| 4 | Le JSON-LD généré ne contient jamais de clé `manufacturer`, et `brand.name === 'aimetapiscine'` quel que soit l'input | objet produit piégé |
| 5 | Un texte d'avis contenant le token, avec accents / points / espaces intercalés, est détecté | 6 variantes de casse et de ponctuation |
| 6 | **Faux positifs** : une liste de 20 mots français et de 5 marques légitimes du secteur ne matchent pas | chaîne |

Le token de test est injecté via `process.env.BLIND_SHIPPING_DENYLIST` dans le setup Vitest. **Le fichier de test ne contient jamais la vraie denylist.**

---

## Critère de done

- [ ] `npm run test -- blind-shipping` passe, 6 vecteurs verts.
- [ ] Retirer manuellement le `sanitize()` du pipeline d'upload fait échouer le test 1. *(vérifié une fois, à la main, puis restauré)*
- [ ] `grep -ri` sur le dépôt ne remonte aucune occurrence du nom du fournisseur, hors `.env.local` (qui est gitignored).
- [ ] Le type de retour de `buildProductJsonLd()` rend `manufacturer` inexprimable.
- [ ] `scripts/resanitize-storage.ts` a tourné une fois ; le rapport est lu et archivé.
- [ ] L'URL de suivi transporteur a été ouverte, inspectée, et le verdict est écrit dans `decisions.md` avec la date.
- [ ] Entrée `decisions.md` rédigée.

---

## Notes d'implémentation (Windows / PowerShell 5.1)

- `sharp` a des binaires natifs. Après un `npm install` sur Windows, vérifier que le build fonctionne aussi sur Vercel (Linux) — épingler la version, et ne pas commiter `node_modules`.
- Pour tester l'upload en local : `curl.exe`, corps via fichier, `--data-binary "@body.json"`.
