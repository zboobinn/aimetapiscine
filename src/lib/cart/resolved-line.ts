import type { CatalogEntry } from "@/lib/catalog/schema";
import type { LineCharge } from "@/lib/pricing/resolve-price";

/**
 * Forme d'une ligne de panier résolue, renvoyée par `/api/cart/resolve` (09).
 * AUCUN `sku` ici — seul `slug` quitte le serveur (23, decisions.md) : le SKU
 * catalogue est préfixé `APF-...` (référence fournisseur interne, 01) et ne
 * doit jamais apparaître dans une réponse client.
 */
export interface ResolvedCartLine {
  slug: string;
  name: string;
  image: string;
  unit: string;
  category: string;
  quantity: number;
  /** HT unitaire (prix catalogue résolu pour CE rôle, 14) — affiché tel quel à un pro (« PU HT »). */
  unitHtCents: number;
  vatRateBps: number;
  /** HT total de la ligne, remise pack (13) déjà déduite. */
  lineHtCents: number;
  /** TVA totale de la ligne. */
  lineVatCents: number;
  /**
   * Montant RÉELLEMENT dû pour cette ligne (HT remisé + TVA) — calculé par
   * la MÊME fonction que `/api/checkout` (`computeLineCharge`, 10/13/14) :
   * ce que le panier affiche est, au centime près, ce qui sera débité.
   */
  lineTtcCents: number;
  /** TTC ligne avant remise — présent uniquement si `discountBps > 0` (prix barré, 05). */
  compareAtLineTtcCents?: number;
  discountBps: number;
  /** `false` si le SKU est introuvable ou hors stock : la ligne doit être signalée et purgeable côté UI (09). */
  available: boolean;
}

/** Ligne non résolue (slug introuvable dans le catalogue) — jamais d'identifiant brut renvoyé au client. */
export function buildUnavailableCartLine(slug: string, quantity: number): ResolvedCartLine {
  return {
    slug,
    name: "Produit indisponible",
    image: "",
    unit: "unite",
    category: "AUTRE",
    quantity,
    unitHtCents: 0,
    vatRateBps: 0,
    lineHtCents: 0,
    lineVatCents: 0,
    lineTtcCents: 0,
    discountBps: 0,
    available: false,
  };
}

export function buildResolvedCartLine(
  product: CatalogEntry,
  quantity: number,
  discountBps: number,
  charge: LineCharge,
  compareAtLineTtcCents: number | undefined,
): ResolvedCartLine {
  return {
    slug: product.slug,
    name: product.name,
    image: product.image,
    unit: product.unit,
    category: product.category,
    quantity,
    unitHtCents: charge.unitHtCents,
    vatRateBps: product.vat_rate,
    lineHtCents: charge.lineHtCents,
    lineVatCents: charge.lineVatCents,
    lineTtcCents: charge.lineTtcCents,
    compareAtLineTtcCents,
    discountBps,
    available: product.in_stock,
  };
}
