import sharp from "sharp";

import { ApiErrorCode } from "@/lib/api/errors";
import { containsForbiddenToken } from "@/lib/blind-shipping";

/**
 * Pipeline de nettoyage d'image produit (27). Toute image, sans exception,
 * passe par ici avant écriture dans Supabase Storage.
 */

export class UnsafeUploadError extends Error {
  readonly code = ApiErrorCode.UNSAFE_CONTENT;

  constructor() {
    // Message toujours opaque (15/23) — jamais le nom de fichier ni le token
    // qui a matché.
    super("Nom de fichier refusé");
    this.name = "UnsafeUploadError";
  }
}

interface SanitizeProductImageInput {
  buffer: Buffer;
  originalFilename: string;
  slug: string;
  coloris: string;
  index: number;
}

interface SanitizedImageOutput {
  /** Nom de fichier réécrit côté serveur, sans extension (`{slug}-{coloris}-{index}`). */
  filename: string;
  avif: { large: Buffer; small: Buffer };
  webp: { large: Buffer; small: Buffer };
}

const WIDTH_LARGE = 1600;
const WIDTH_SMALL = 800;
const QUALITY = 72;

export async function sanitizeProductImage(
  input: SanitizeProductImageInput,
): Promise<SanitizedImageOutput> {
  // Le nom d'origine n'est jamais persisté ni logué (27) — seul le verdict
  // (rejeté/accepté) laisse une trace, jamais la chaîne elle-même.
  if (containsForbiddenToken(input.originalFilename)) {
    throw new UnsafeUploadError();
  }

  const filename = `${input.slug}-${input.coloris}-${input.index}`;
  const source = sharp(input.buffer);

  // `sharp` supprime TOUTES les métadonnées (EXIF/IPTC/XMP) par défaut à
  // l'encodage. Ne JAMAIS appeler `.withMetadata()` ci-dessous : ça
  // réembarquerait exactement les métadonnées que ce pipeline existe pour
  // fermer (27, D7 — copyright fournisseur dans l'EXIF, entre autres).
  const [avifLarge, avifSmall, webpLarge, webpSmall] = await Promise.all([
    source.clone().resize({ width: WIDTH_LARGE }).avif({ quality: QUALITY }).toBuffer(),
    source.clone().resize({ width: WIDTH_SMALL }).avif({ quality: QUALITY }).toBuffer(),
    source.clone().resize({ width: WIDTH_LARGE }).webp({ quality: QUALITY }).toBuffer(),
    source.clone().resize({ width: WIDTH_SMALL }).webp({ quality: QUALITY }).toBuffer(),
  ]);

  return {
    filename,
    avif: { large: avifLarge, small: avifSmall },
    webp: { large: webpLarge, small: webpSmall },
  };
}
