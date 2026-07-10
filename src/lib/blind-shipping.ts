/**
 * Blind shipping — détection de tokens fournisseur dans du texte public (27).
 *
 * FORMAT DE LA DENYLIST : `BLIND_SHIPPING_DENYLIST` est une liste de tokens
 * MONO-MOT séparés par des virgules (ex. "zolvex,brumanor"). Un token ne doit
 * jamais contenir d'espace — un token multi-mots (ex. "Brumanor SCI") crée un
 * dilemme non résolu proprement (D11/D13) : accepter un mot terminal en
 * préfixe libre pour détecter une variante ferait aussi matcher un mot collé
 * sans rapport. Un nom fournisseur à plusieurs mots doit être décomposé en
 * tokens mono-mot indépendants dans l'env (n'importe lequel suffit à
 * déclencher la détection). Un token contenant un espace est accepté par
 * tolérance mais scindé automatiquement en tokens mono-mot au chargement,
 * avec un avertissement (jamais une erreur bloquante).
 *
 * DÉTECTION À TROIS PASSES (D10) — la normalisation et les frontières de mot
 * sont incompatibles : dépouiller la ponctuation détruit les frontières
 * qu'on veut préserver. D'où trois passes indépendantes, chacune exportée et
 * testable séparément :
 *   1. `collapseIsolatedLetters` — fusionne les lettres isolées séparées par
 *      de la ponctuation ("x.y.z." → "xyz"), sans toucher aux mots de
 *      plusieurs lettres ("cap z" reste "cap z").
 *   2. `matchesWholeWord` — sur le texte de la passe 1, cherche le token
 *      comme mot ENTIER (frontières des deux côtés), jamais un préfixe/suffixe.
 *   3. `matchesAggressiveSubstring` — cherche le token n'importe où, même
 *      noyé dans un mot plus long, mais UNIQUEMENT pour les tokens d'au
 *      moins 5 caractères (D10/D13) : en dessous, le hasard du français
 *      produit des collisions (un token court "zvx" matcherait à tort dans
 *      "zvxelstrudel") ; à partir de 5 caractères, toute occurrence est jugée
 *      assez distinctive pour être intentionnelle ("zolvexair" matche bien
 *      "zolvex").
 *
 * LIMITE DE COUVERTURE ACCEPTÉE (D11) : les mots génériques d'un nom
 * fournisseur composite sont inutilisables comme tokens (ils censureraient du
 * contenu légitime) — un avis qui ne mentionne que la partie générique du nom
 * passe le filtre. Risque résiduel assumé ; c'est la raison pour laquelle la
 * modération a priori des avis avec photo (D9, spec 31) n'est pas négociable.
 */

const MIN_SUBSTRING_TOKEN_LENGTH = 5;

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Passe 1 — fusionne les runs de lettres ISOLÉES (un seul caractère alphanum)
 * séparées par de la ponctuation/espaces en un seul mot. "x.y.z." → "xyz",
 * "x-y-z" → "xyz", "x y z" → "xyz". Un mot de plusieurs lettres n'est jamais
 * fusionné : "cap z" reste "cap z" (aucune ambiguïté possible avec "cap").
 */
export function collapseIsolatedLetters(input: string): string {
  const normalized = normalizeText(input);
  const parts = normalized.match(/[a-z0-9]+|[^a-z0-9]+/g) ?? [];
  const result: string[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    const isSingleLetter = /^[a-z0-9]$/.test(part);

    if (!isSingleLetter) {
      result.push(part);
      i += 1;
      continue;
    }

    let run = part;
    let j = i + 1;

    while (j + 1 < parts.length) {
      const separator = parts[j];
      const next = parts[j + 1];
      const separatorIsPunctuation = /^[^a-z0-9]+$/.test(separator);
      const nextIsSingleLetter = /^[a-z0-9]$/.test(next);

      if (separatorIsPunctuation && nextIsSingleLetter) {
        run += next;
        j += 2;
      } else {
        break;
      }
    }

    result.push(run);
    i = j;
  }

  return result.join("");
}

/**
 * Passe 2 — le token doit apparaître comme mot ENTIER (frontières des deux
 * côtés) dans le texte déjà passé par la passe 1. Jamais un préfixe/suffixe.
 */
export function matchesWholeWord(input: string, token: string): boolean {
  const collapsed = collapseIsolatedLetters(input);
  const words: string[] = collapsed.match(/[a-z0-9]+/g) ?? [];
  return words.includes(normalizeText(token));
}

/**
 * Passe 3 — le token peut apparaître n'importe où, même noyé dans un mot,
 * mais UNIQUEMENT pour les tokens d'au moins `MIN_SUBSTRING_TOKEN_LENGTH`
 * caractères (D10/D13). En dessous, cette passe est désactivée pour ce
 * token : voir `getDenylistTokens()` pour l'avertissement au chargement.
 */
export function matchesAggressiveSubstring(input: string, token: string): boolean {
  const normalizedToken = normalizeText(token);
  if (normalizedToken.length < MIN_SUBSTRING_TOKEN_LENGTH) return false;

  const flattened = normalizeText(input).replace(/[^a-z0-9]/g, "");
  return flattened.includes(normalizedToken);
}

interface DenylistToken {
  value: string;
  eligibleForSubstringPass: boolean;
}

let cachedRawEnv: string | undefined;
let cachedTokens: DenylistToken[] = [];

function getDenylistTokens(): DenylistToken[] {
  const raw = process.env.BLIND_SHIPPING_DENYLIST ?? "";
  if (raw === cachedRawEnv) return cachedTokens;

  const tokens: DenylistToken[] = [];

  for (const rawEntry of raw.split(",")) {
    const entry = rawEntry.trim();
    if (!entry) continue;

    const words = normalizeText(entry)
      .split(/\s+/)
      .filter(Boolean);

    if (words.length > 1) {
      console.warn(
        `[blind-shipping] token multi-mots "${entry}" scindé en tokens mono-mot indépendants (D11) — n'importe lequel déclenche la détection.`,
      );
    }

    for (const word of words) {
      const eligibleForSubstringPass = word.length >= MIN_SUBSTRING_TOKEN_LENGTH;

      if (!eligibleForSubstringPass) {
        console.warn(
          `[blind-shipping] token "${word}" (${word.length} car.) exclu de la passe 3 (substring agressif, D10) — trop court pour éviter les faux positifs.`,
        );
      }

      tokens.push({ value: word, eligibleForSubstringPass });
    }
  }

  cachedRawEnv = raw;
  cachedTokens = tokens;
  return tokens;
}

export function containsForbiddenToken(input: string): boolean {
  const tokens = getDenylistTokens();

  return tokens.some(
    (token) =>
      matchesWholeWord(input, token.value) ||
      (token.eligibleForSubstringPass && matchesAggressiveSubstring(input, token.value)),
  );
}

export class BlindShippingViolationError extends Error {
  constructor(context: string) {
    // Message générique : le contexte est un libellé fixe passé par
    // l'appelant (ex. "product-jsonld"), jamais le contenu fautif ni le
    // token qui a matché (23/27).
    super(`Contenu bloqué par le garde-fou blind shipping (${context})`);
    this.name = "BlindShippingViolationError";
  }
}

/** Throw si `input` contient un token interdit — jamais de repli silencieux. */
export function assertBlindSafe(input: string, context: string): void {
  if (containsForbiddenToken(input)) {
    throw new BlindShippingViolationError(context);
  }
}

function redactPreview(input: string): string {
  return input.replace(/[a-zA-Z0-9]/g, "•").slice(0, 80);
}

/**
 * Garde non bloquante pour les champs texte publics (alt, titre, description,
 * coloris — régime « donnée saisie ailleurs », D12/Amendement 4) : jamais de
 * throw, jamais de crash de page. En cas de match, logge UNIQUEMENT des
 * métadonnées structurelles + un aperçu caviardé — jamais le contenu fautif
 * ni le token qui a matché (Amendement 1), pour ne pas déplacer la fuite vers
 * les logs Vercel.
 */
export function sanitizePublicField(
  input: string,
  context: string,
  fallback: string,
  meta?: { entityId?: string },
): string {
  if (!containsForbiddenToken(input)) {
    return input;
  }

  console.error("[blind-shipping] contenu public bloqué", {
    field: context,
    entityId: meta?.entityId ?? null,
    inputLength: input.length,
    preview: redactPreview(input),
  });

  return fallback;
}
