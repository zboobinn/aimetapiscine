import { ApiErrorCode } from "@/lib/api/errors";
import { NO_STORE_HEADERS, apiError, apiSuccess } from "@/lib/api/response";
import { getAllProducts } from "@/lib/catalog/data";
import { withLivePricingOne } from "@/lib/catalog/live-pricing";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";

export const dynamic = "force-dynamic";

/**
 * Hydratation client du prix pro sur les fiches produit (07/14) : la page
 * ISR ne sert QUE le prix public dans le HTML mis en cache, jamais
 * `pro_price_ht`. Cette route, dynamique et jamais mise en cache, résout le
 * rôle réel de la requête (cookies de session) et ne renvoie le prix pro
 * que si ce rôle est "b2b" — la même logique serveur que /api/cart/resolve
 * et /api/checkout, réutilisée telle quelle.
 */
export async function GET(request: Request) {
  const sku = new URL(request.url).searchParams.get("sku");

  if (!sku) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, "Le paramètre sku est requis.");
  }

  const catalogProduct = getAllProducts().find((p) => p.sku === sku);

  if (!catalogProduct) {
    return apiError(ApiErrorCode.NOT_FOUND, "Produit introuvable.");
  }

  const product = await withLivePricingOne(catalogProduct);
  const role = await resolvePricingRole();
  const { unitAmountCents, unitHtCents } = await resolvePriceBreakdown(product, role);

  return apiSuccess({ role, unitAmountCents, unitHtCents }, { headers: NO_STORE_HEADERS });
}
