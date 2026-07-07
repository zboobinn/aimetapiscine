import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllProducts } from "@/lib/catalog/data";
import { resolveUnitPriceCents } from "@/lib/pricing/resolve-price";
import { resolvePricingRole } from "@/lib/pricing/resolve-role";
import type { PricingRole } from "@/lib/pricing/types";

/**
 * Résolution serveur des prix du panier (09/23) : le client n'envoie que
 * SKU + quantités, jamais de montant. Le rôle et les prix viennent
 * exclusivement du catalogue lu ici, comme sur le reste du site (04) — la
 * bascule PRO_VERIFIED (14) ne change que `resolvePricingRole()`.
 */

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .max(200),
});

export interface ResolvedCartLine {
  sku: string;
  slug: string;
  name: string;
  image: string;
  unit: string;
  category: string;
  quantity: number;
  unitPriceCents: number;
  /** `false` si le SKU est introuvable ou hors stock : la ligne doit être signalée et purgeable côté UI (09). */
  available: boolean;
}

export interface ResolveCartResponse {
  role: PricingRole;
  lines: ResolvedCartLine[];
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const role = await resolvePricingRole();
  const products = getAllProducts();

  const lines: ResolvedCartLine[] = parsed.data.lines.map(({ sku, quantity }) => {
    const product = products.find((p) => p.sku === sku);

    if (!product) {
      return {
        sku,
        slug: sku,
        name: "Produit indisponible",
        image: "",
        unit: "unite",
        category: "AUTRE",
        quantity,
        unitPriceCents: 0,
        available: false,
      };
    }

    return {
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      unit: product.unit,
      category: product.category,
      quantity,
      unitPriceCents: resolveUnitPriceCents(product, role),
      available: product.in_stock,
    };
  });

  const response: ResolveCartResponse = { role, lines };
  return NextResponse.json(response);
}
