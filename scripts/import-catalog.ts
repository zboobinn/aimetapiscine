import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { toProductRow } from "@/lib/catalog/product-row";
import { catalogFileSchema, type CatalogEntry } from "@/lib/catalog/schema";
import { getSupabaseServiceEnv } from "@/lib/env";

/**
 * Import idempotent de `data/catalog.json` vers `public.products` (04).
 * Upsert par `sku` ; les SKU absents du fichier sont désactivés
 * (`is_active = false`), jamais supprimés (03).
 *
 * Ce script tourne hors du runtime Next.js (exécuté via `tsx`), donc il ne
 * doit PAS importer `@/lib/supabase/service-role` : ce module est protégé
 * par `server-only`, qui lève une erreur en dehors d'un build Next.js. Le
 * client service_role est reconstruit ici, localement. `getSupabaseServiceEnv()`
 * ne valide QUE les 2 variables Supabase nécessaires (26) — pas Stripe,
 * Resend ni la config société, dont ce script n'a pas besoin.
 */

function createServiceRoleClient() {
  const env = getSupabaseServiceEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface ExistingProduct {
  sku: string;
  is_active: boolean;
}

function loadCatalog(): CatalogEntry[] {
  const filePath = join(process.cwd(), "data", "catalog.json");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = catalogFileSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("catalog.json invalide — import annulé :\n");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data.products;
}

async function main() {
  const products = loadCatalog();
  const supabase = createServiceRoleClient();

  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("sku, is_active")
    .returns<ExistingProduct[]>();

  if (fetchError) {
    console.error("Lecture des produits existants impossible :", fetchError.message);
    process.exit(1);
  }

  const existingBySku = new Map((existing ?? []).map((product) => [product.sku, product]));
  const fileSkus = new Set(products.map((product) => product.sku));

  const created: string[] = [];
  const updated: string[] = [];

  for (const product of products) {
    const { error } = await supabase
      .from("products")
      .upsert(toProductRow(product), { onConflict: "sku" });

    if (error) {
      console.error(`Échec de l'upsert pour ${product.sku} :`, error.message);
      process.exit(1);
    }

    if (existingBySku.has(product.sku)) {
      updated.push(product.sku);
    } else {
      created.push(product.sku);
    }
  }

  const toDisable = [...existingBySku.values()]
    .filter((product) => !fileSkus.has(product.sku) && product.is_active)
    .map((product) => product.sku);

  if (toDisable.length > 0) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .in("sku", toDisable);

    if (error) {
      console.error("Échec de la désactivation des SKU absents :", error.message);
      process.exit(1);
    }
  }

  console.log("\n=== Import catalogue ===");
  console.log(`Créés      (${created.length}) : ${created.join(", ") || "-"}`);
  console.log(`Mis à jour (${updated.length}) : ${updated.join(", ") || "-"}`);
  console.log(`Désactivés (${toDisable.length}) : ${toDisable.join(", ") || "-"}`);
}

main();
