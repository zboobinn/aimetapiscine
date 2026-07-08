import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Buckets privés (11) : jamais de policy anon/authenticated sur
 * `storage.objects` (migration 20260708000000) — seul `service_role`
 * (bypass RLS) lit/écrit. Les URL signées sont émises à la demande, jamais
 * persistées (elles expirent).
 */
export const DELIVERY_NOTES_BUCKET = "delivery-notes";
export const INVOICES_BUCKET = "invoices";

export async function uploadOrderDocument(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  pdf: Buffer,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload ${bucket}/${path} échoué : ${error.message}`);
  }
}

export async function createSignedDocumentUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`URL signée ${bucket}/${path} échouée : ${error?.message}`);
  }

  return data.signedUrl;
}
