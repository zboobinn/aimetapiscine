import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { getSupabaseServiceEnv } from "@/lib/env";

/**
 * Migration des assets existants (27, "Migration des assets existants").
 * One-shot, exécuté À LA MAIN une seule fois — PAS de CI, pas de cron :
 *
 *   pnpm tsx --env-file=.env.local scripts/resanitize-storage.ts
 *
 * Liste tous les objets du bucket public de photos produit, relit chacun,
 * le repasse dans un pipeline `sharp` (même règle que
 * `lib/images/sanitize.ts` — JAMAIS `.withMetadata()`, sharp supprime toutes
 * les métadonnées par défaut à l'encodage), réécrit l'objet au même chemin,
 * et produit `resanitize-report.json` listant les fichiers dont les
 * métadonnées d'origine contenaient quoi que ce soit (EXIF/IPTC/XMP/ICC) —
 * à lire par un humain, pas à consommer automatiquement.
 *
 * Ce script tourne hors du runtime Next.js (via `tsx`), donc il reconstruit
 * son propre client `service_role` plutôt que d'importer
 * `@/lib/supabase/service-role` (protégé par `server-only`, qui lève hors
 * build Next.js) — même pattern que `scripts/import-catalog.ts`.
 *
 * NE PAS élargir le format de sortie ici pour retrouver la paire AVIF/WebP
 * 1600/800 du pipeline d'upload (`lib/images/sanitize.ts`) : ce script
 * nettoie des objets déjà en place à un chemin donné (nettoyage rétroactif,
 * hors périmètre du pipeline d'upload normal, 27 "Hors périmètre") ; changer
 * de format changerait le chemin et casserait les références existantes. Il
 * réencode dans le MÊME format, au MÊME chemin, uniquement pour purger les
 * métadonnées.
 *
 * `PRODUCT_IMAGES_BUCKET` n'existe pas encore côté Supabase à l'écriture de
 * ce script (aucune vraie photo produit déposée, aucun bucket public créé —
 * voir docs/decisions.md, 2026-07-14) : ce script est écrit par anticipation.
 * Mettre à jour le nom ci-dessous si le bucket réel porte un autre nom.
 */

const PRODUCT_IMAGES_BUCKET = "product-images";
const REPORT_PATH = join(process.cwd(), "resanitize-report.json");

const METADATA_KEYS = ["exif", "icc", "iptc", "xmp"] as const;
type MetadataKey = (typeof METADATA_KEYS)[number];

interface ReportEntry {
  path: string;
  hadMetadata: boolean;
  metadataKeys: MetadataKey[];
  reencoded: boolean;
  error?: string;
}

function createServiceRoleClient(): SupabaseClient {
  const env = getSupabaseServiceEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * `storage.list()` n'est pas récursif — parcours en largeur des dossiers.
 * Un objet Storage sans `id` est un dossier (convention Supabase Storage).
 */
async function listAllObjectPaths(supabase: SupabaseClient, bucket: string): Promise<string[]> {
  const paths: string[] = [];
  const queue: string[] = [""];

  while (queue.length > 0) {
    const prefix = queue.shift() as string;
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });

    if (error) {
      throw new Error(`Listage ${bucket}/${prefix || "/"} échoué : ${error.message}`);
    }

    for (const entry of data ?? []) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        queue.push(fullPath);
      } else {
        paths.push(fullPath);
      }
    }
  }

  return paths;
}

async function resanitizeObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<ReportEntry> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    return {
      path,
      hadMetadata: false,
      metadataKeys: [],
      reencoded: false,
      error: error?.message ?? "téléchargement vide",
    };
  }

  const original = Buffer.from(await data.arrayBuffer());
  const metadata = await sharp(original).metadata();
  const metadataKeys = METADATA_KEYS.filter((key) => metadata[key] !== undefined);
  const format = metadata.format ?? "jpeg";

  // Comme `lib/images/sanitize.ts` : ne JAMAIS appeler `.withMetadata()` —
  // sharp supprime tout par défaut à l'encodage, c'est le seul mécanisme.
  const cleaned = await sharp(original).toFormat(format).toBuffer();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, cleaned, {
    upsert: true,
    contentType: data.type || `image/${format}`,
  });

  if (uploadError) {
    return {
      path,
      hadMetadata: metadataKeys.length > 0,
      metadataKeys,
      reencoded: false,
      error: uploadError.message,
    };
  }

  return { path, hadMetadata: metadataKeys.length > 0, metadataKeys, reencoded: true };
}

async function main() {
  const supabase = createServiceRoleClient();
  const objectPaths = await listAllObjectPaths(supabase, PRODUCT_IMAGES_BUCKET);

  console.log(`\n=== Resanitize ${PRODUCT_IMAGES_BUCKET} (${objectPaths.length} objets) ===`);

  const entries: ReportEntry[] = [];

  for (const path of objectPaths) {
    try {
      entries.push(await resanitizeObject(supabase, PRODUCT_IMAGES_BUCKET, path));
    } catch (caught) {
      entries.push({
        path,
        hadMetadata: false,
        metadataKeys: [],
        reencoded: false,
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }
  }

  const taintedCount = entries.filter((entry) => entry.hadMetadata).length;
  const failedCount = entries.filter((entry) => entry.error).length;

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bucket: PRODUCT_IMAGES_BUCKET,
        objectCount: objectPaths.length,
        taintedCount,
        failedCount,
        entries,
      },
      null,
      2,
    ),
  );

  console.log(`Objets avec métadonnées avant nettoyage : ${taintedCount}/${objectPaths.length}`);
  console.log(`Échecs                                  : ${failedCount}/${objectPaths.length}`);
  console.log(`Rapport écrit : ${REPORT_PATH}`);
}

main();
