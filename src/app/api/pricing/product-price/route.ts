import { z } from "zod";

import { ApiErrorCode } from "@/lib/api/errors";
import { NO_STORE_HEADERS, apiError, apiSuccess } from "@/lib/api/response";
import { parseSearchParams } from "@/lib/api/validate";
import { getAllProducts } from "@/lib/catalog/data";
import { withLivePricing, withLivePricingOne } from "@/lib/catalog/live-pricing";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import { computePublicTtcCents } from "@/lib/pricing/vat";

export const dynamic = "force-dynamic";

const searchParamsSchema = z.object({
  slug: z.string().min(1),
  /**
   * Slugs des accessoires de la checklist de chantier (29c②), séparés par
   * des virgules — un GET ne porte pas de tableau natif et
   * `parseSearchParams` (`Object.fromEntries`) écraserait un paramètre
   * répété (`?accessorySlugs=a&accessorySlugs=b` ne garderait que `b`).
   */
  accessorySlugs: z.string().optional(),
});

/**
 * Hydratation client du prix pro sur les fiches produit (07/14/29b) : la
 * page ISR ne sert QUE le prix public dans le HTML mis en cache, jamais
 * `pro_price_ht`. Cette route, dynamique et jamais mise en cache, résout le
 * rôle réel de la requête (cookies de session, `resolvePricingRole()` —
 * JAMAIS un paramètre client : un éventuel `?role=` dans l'URL n'est même
 * pas lu par `searchParamsSchema`).
 *
 * Forme de réponse structurellement dépendante du rôle (règle sacrée) :
 * - b2c (ou non authentifié) : `{ role: "b2c", publicTtcCents }` — AUCUN
 *   champ HT ni pro, jamais mis à zéro, absent de l'objet. Le calcul du prix
 *   pro (`resolveProUnitHtCents`, lecture `service_role`/`store_settings`)
 *   n'est même pas exécuté pour ce rôle.
 * - b2b vérifié : `{ role: "b2b", publicTtcCents, proUnitAmountCents,
 *   proUnitHtCents, accessoryProPricing }` — le prix public (pour l'affichage
 *   barré, décision 29b) ET le prix pro, déjà résolu côté serveur pour CE
 *   rôle vérifié. `proUnitHtCents` (29b③) est le HT unitaire pro tel quel :
 *   le client PDP le réinjecte dans `recalculatePdpBuyBoxAmounts` (29b①)
 *   comme `unitHtCents` pour faire basculer les 4 valeurs de la buy-box en
 *   tarif pro, EXACTEMENT la même chaîne `computeLineChargeFromUnitHt` que
 *   le b2c — jamais une seconde chaîne de calcul.
 *
 *   `accessoryProPricing` (29c② partie A, correctif « PDP ≠ panier ») :
 *   `Record<slug, { proUnitHtCents; proUnitAmountCents }>` pour chaque
 *   accessoire de la checklist demandé via `accessorySlugs` — MÊME rôle,
 *   résolu dans le MÊME aller-retour que la membrane (jamais un second fetch
 *   côté client). Avant ce correctif, la checklist facturait les accessoires
 *   au prix PUBLIC quel que soit le rôle, alors que la membrane basculait en
 *   pro : le total affiché sur la PDP divergeait de celui du panier. Calculé
 *   UNIQUEMENT dans la branche b2b, avec la MÊME fonction
 *   `resolvePriceBreakdown` que la membrane — jamais une seconde chaîne de
 *   résolution de prix pro.
 *
 * `slug`/`accessorySlugs` (jamais `sku`, préfixé `APF-...`) sont les seuls
 * identifiants acceptés en entrée (23, decisions.md).
 */
export async function GET(request: Request) {
  const parsed = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema);
  if ("response" in parsed) return parsed.response;

  const catalogProduct = getAllProducts().find((p) => p.slug === parsed.data.slug);

  if (!catalogProduct) {
    return apiError(ApiErrorCode.NOT_FOUND, "Produit introuvable.");
  }

  const product = await withLivePricingOne(catalogProduct);
  const role = await resolvePricingRole();
  const publicTtcCents = computePublicTtcCents(product.base_price_ht, product.vat_rate);

  if (role !== "b2b") {
    return apiSuccess({ role: "b2c" as const, publicTtcCents }, { headers: NO_STORE_HEADERS });
  }

  const { unitAmountCents: proUnitAmountCents, unitHtCents: proUnitHtCents } =
    await resolvePriceBreakdown(product, "b2b");

  // Accessoires de la checklist (29c②) : résolus uniquement ici (branche
  // b2b) — un b2c n'a besoin d'aucune donnée accessoire (déjà connue côté
  // client au prix public, `checklistAccessories`). `withLivePricing` (lot
  // unique, pas un appel par accessoire) puis `resolvePriceBreakdown`, MÊME
  // fonction que la membrane, jamais une seconde chaîne de résolution.
  const allProducts = getAllProducts();
  const accessorySlugs = parsed.data.accessorySlugs
    ? Array.from(new Set(parsed.data.accessorySlugs.split(",").filter(Boolean)))
    : [];
  const accessoryCatalogProducts = accessorySlugs
    .map((slug) => allProducts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const liveAccessoryProducts = await withLivePricing(accessoryCatalogProducts);

  const accessoryProPricing: Record<string, { proUnitHtCents: number; proUnitAmountCents: number }> = {};
  await Promise.all(
    liveAccessoryProducts.map(async (accessoryProduct) => {
      const breakdown = await resolvePriceBreakdown(accessoryProduct, "b2b");
      accessoryProPricing[accessoryProduct.slug] = {
        proUnitHtCents: breakdown.unitHtCents,
        proUnitAmountCents: breakdown.unitAmountCents,
      };
    }),
  );

  return apiSuccess(
    {
      role: "b2b" as const,
      publicTtcCents,
      proUnitAmountCents,
      proUnitHtCents,
      accessoryProPricing,
    },
    { headers: NO_STORE_HEADERS },
  );
}
