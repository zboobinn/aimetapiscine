import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/catalog/data";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";

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
    return NextResponse.json({ error: "missing_sku" }, { status: 400 });
  }

  const product = getAllProducts().find((p) => p.sku === sku);

  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const role = await resolvePricingRole();
  const { unitAmountCents, unitHtCents } = resolvePriceBreakdown(product, role);

  return NextResponse.json(
    { role, unitAmountCents, unitHtCents },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
