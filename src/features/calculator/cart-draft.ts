import type { CatalogEntry } from "@/lib/catalog/schema";
import { attachMembraneProduct } from "./calculate-pack";
import type { CalculatorResult } from "./types";

/**
 * Interface de préparation à l'ajout panier. Le panier réel (09) n'existe
 * pas encore : cette fonction pure construit uniquement les lignes que le
 * futur `addToCart()` consommera, pour ne pas avoir à retoucher l'UI du
 * calculateur quand 09 sera implémentée.
 */
export interface CartLineDraft {
  sku: string;
  slug: string;
  name: string;
  quantity: number;
  unit: string;
}

export function buildCartDraft(
  result: CalculatorResult,
  membraneProduct: CatalogEntry,
): CartLineDraft[] {
  const membraneLine = attachMembraneProduct(result.membrane, membraneProduct);

  return [membraneLine, ...result.accessories].map(({ sku, slug, name, quantity, unit }) => ({
    sku,
    slug,
    name,
    quantity,
    unit,
  }));
}
