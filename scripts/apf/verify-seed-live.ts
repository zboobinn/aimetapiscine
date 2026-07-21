import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, getSupabaseServiceEnv } from "@/lib/env";

/**
 * Vérification MANUELLE, contre le vrai projet Supabase cloud — à exécuter
 * à la main par Léo (`pnpm tsx --env-file=.env.local scripts/apf/verify-seed-live.ts`),
 * jamais par `pnpm test` ni en CI. Même précédent que
 * `scripts/resanitize-storage.ts` (spec 27) : une vérification qui parle au
 * vrai backend (clé anon publique, RLS réelle) n'a rien à faire dans une
 * suite Vitest qui, partout ailleurs, ne touche jamais le réseau.
 *
 * Couvre les 3 volets de la consigne étape 4 qui ne sont PAS vérifiables en
 * pur unitaire (déjà couverts : tests/apf-seed-products.spec.ts) :
 *   1. Un produit/variante `brouillon` n'est jamais renvoyé par une lecture
 *      anonyme (= ce que verrait n'importe quelle route façade publique,
 *      catalogue/sitemap/PDP directe — aucune de ces routes n'existe encore,
 *      donc ce script interroge directement la même surface RLS qu'elles
 *      utiliseront).
 *   2. `ref_apf` / `pro_price_ht` ne sont jamais lisibles par la clé anon
 *      sur `product_variants`, même en `select("*")` — le privilège de
 *      colonne (migration 20260720000200) est le mécanisme dont dépendra
 *      aussi un futur embed `order_items → product_variants → products`
 *      (hors périmètre ici : pas de commande/tunnel à seeder).
 *   3. Idempotence : lance `seedProducts()` deux fois, compare les compteurs.
 */

let failures = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const publicEnv = getSupabaseEnv();
  const serviceEnv = getSupabaseServiceEnv();

  const anon = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const serviceRole = createClient(serviceEnv.NEXT_PUBLIC_SUPABASE_URL, serviceEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== 1. Brouillon jamais visible en lecture anonyme ===");

  const { data: draftProductService } = await serviceRole
    .from("products")
    .select("id, slug")
    .eq("statut", "brouillon")
    .limit(1)
    .maybeSingle();

  if (!draftProductService) {
    console.log("  (aucun produit brouillon en base — rien à vérifier ici)");
  } else {
    const { data: draftViaAnon, error } = await anon
      .from("products")
      .select("id, slug")
      .eq("id", draftProductService.id)
      .maybeSingle();

    check(
      `produit brouillon "${draftProductService.slug}" invisible pour anon`,
      draftViaAnon === null,
      error ? undefined : `renvoyé quand même : ${JSON.stringify(draftViaAnon)}`,
    );

    const { data: variantsViaAnon } = await anon
      .from("product_variants")
      .select("id")
      .eq("product_id", draftProductService.id);

    check(
      `variantes du produit brouillon "${draftProductService.slug}" invisibles pour anon`,
      (variantsViaAnon ?? []).length === 0,
      `${(variantsViaAnon ?? []).length} ligne(s) renvoyée(s)`,
    );
  }

  const { data: suppressedVariantService } = await serviceRole
    .from("product_variants")
    .select("id, ref_apf, product_id, products!inner(statut)")
    .eq("is_active", false)
    .eq("products.statut", "publie")
    .limit(1)
    .maybeSingle();

  if (!suppressedVariantService) {
    console.log("  (aucune variante is_active=false sur un produit publié — rien à vérifier ici)");
  } else {
    const { data: viaAnon } = await anon
      .from("product_variants")
      .select("id")
      .eq("id", suppressedVariantService.id)
      .maybeSingle();

    check(
      `variante supprimée "${suppressedVariantService.ref_apf}" (produit publié, is_active=false) invisible pour anon`,
      viaAnon === null,
    );
  }

  console.log("\n=== 2. ref_apf / pro_price_ht jamais lisibles par anon (product_variants) ===");

  const { data: anySelectAll, error: selectAllError } = await anon
    .from("product_variants")
    .select("*")
    .limit(1);

  if (selectAllError) {
    check("select(*) anon échoue proprement (pas de fuite)", true, selectAllError.message);
  } else {
    const row = (anySelectAll ?? [])[0] as Record<string, unknown> | undefined;
    check(
      "ref_apf absent des colonnes renvoyées par select(*) anon",
      row === undefined || !("ref_apf" in row),
      row ? `colonnes reçues : ${Object.keys(row).join(", ")}` : undefined,
    );
    check(
      "pro_price_ht absent des colonnes renvoyées par select(*) anon",
      row === undefined || !("pro_price_ht" in row),
    );
  }

  const { error: explicitRefApfError } = await anon.from("product_variants").select("ref_apf").limit(1);
  check("select(ref_apf) explicite rejeté par le privilège de colonne", explicitRefApfError !== null);

  const { error: explicitProPriceError } = await anon.from("product_variants").select("pro_price_ht").limit(1);
  check("select(pro_price_ht) explicite rejeté par le privilège de colonne", explicitProPriceError !== null);

  console.log("\n=== 3. Idempotence (2 exécutions de seedProducts()) ===");

  const { seedProducts } = await import("./seed-products");
  const first = await seedProducts();
  const second = await seedProducts();

  check(
    "même nombre de produits seedés entre les deux exécutions",
    first.produitsSeedés === second.produitsSeedés,
    `${first.produitsSeedés} puis ${second.produitsSeedés}`,
  );
  check(
    "même nombre de variantes seedées entre les deux exécutions",
    first.variantesSeedées === second.variantesSeedées,
    `${first.variantesSeedées} puis ${second.variantesSeedées}`,
  );

  const { count: productCount } = await serviceRole
    .from("products")
    .select("*", { count: "exact", head: true });
  const { count: variantCount } = await serviceRole
    .from("product_variants")
    .select("*", { count: "exact", head: true });

  console.log(`  (compteurs base après double exécution : products=${productCount}, product_variants=${variantCount})`);

  console.log(`\n=== Résultat : ${failures === 0 ? "TOUT VERT" : `${failures} échec(s)`} ===`);
  if (failures > 0) process.exit(1);
}

main();
