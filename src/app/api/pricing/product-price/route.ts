import { z } from "zod";

import { ApiErrorCode } from "@/lib/api/errors";
import { NO_STORE_HEADERS, apiError, apiSuccess } from "@/lib/api/response";
import { parseSearchParams } from "@/lib/api/validate";
import { getAllProducts } from "@/lib/catalog/data";
import { withLivePricingOne } from "@/lib/catalog/live-pricing";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import { computePublicTtcCents } from "@/lib/pricing/vat";

export const dynamic = "force-dynamic";

const searchParamsSchema = z.object({ slug: z.string().min(1) });

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
 *   proUnitHtCents }` — le prix public (pour l'affichage barré, décision
 *   29b) ET le prix pro, déjà résolu côté serveur pour CE rôle vérifié.
 *   `proUnitHtCents` (29b③) est le HT unitaire pro tel quel : le client
 *   PDP le réinjecte dans `recalculatePdpBuyBoxAmounts` (29b①) comme
 *   `unitHtCents` pour faire basculer les 4 valeurs de la buy-box en tarif
 *   pro, EXACTEMENT la même chaîne `computeLineChargeFromUnitHt` que le
 *   b2c — jamais une seconde chaîne de calcul.
 *
 * `slug` (jamais `sku`, préfixé `APF-...`) est le seul identifiant accepté
 * en entrée (23, decisions.md).
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

  return apiSuccess(
    { role: "b2b" as const, publicTtcCents, proUnitAmountCents, proUnitHtCents },
    { headers: NO_STORE_HEADERS },
  );
}
