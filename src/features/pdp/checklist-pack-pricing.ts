import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "@/lib/pricing/discounts";
import { computeLineChargeFromUnitHt, type LineCharge } from "@/lib/pricing/line-charge";

export interface ChecklistAccessoryInput {
  slug: string;
  quantity: number;
  unitHtCents: number;
  vatRateBps: number;
}

export interface ChecklistPackAmounts {
  /** `discount_bps` réellement appliqué (13) — 0 tant qu'aucun accessoire n'est coché. */
  discountBps: number;
  membraneCharge: LineCharge;
  /** Une entrée par accessoire fourni, coché ou non (non coché : `discountBps = 0`). */
  accessoryCharges: Record<string, LineCharge>;
  /** Membrane + accessoires COCHÉS uniquement. */
  totalCents: number;
}

const CHECKLIST_PACK_ID = "pdp-checklist-preview";

/**
 * Seuil d'éligibilité (13, `PackManifest.originalSlugs.length >= 2` dans
 * `discounts.ts`) réexprimé du point de vue de la checklist : la membrane
 * est TOUJOURS le premier slug du pack, donc un pack devient complet dès
 * qu'au moins un accessoire est coché. Centralisé ici pour que la buy-box
 * (`discountBps` à faire traverser `recalculatePdpBuyBoxAmounts`) et
 * l'affichage checklist utilisent la MÊME condition, jamais une copie locale.
 */
export function isChecklistPackFormed(checkedSlugs: string[]): boolean {
  return checkedSlugs.length > 0;
}

/**
 * Aperçu du pack formé par la checklist de chantier (29c②) — MÊME chaîne que
 * le panier/checkout : `computeLineDiscountsBps` (13, `lib/pricing/discounts.ts`)
 * décide l'éligibilité (pack complet dès que la membrane + au moins un
 * accessoire coché sont réunis, seuil identique à `addPackLines`/
 * `/api/cart/resolve`), puis `computeLineChargeFromUnitHt` (`line-charge.ts`)
 * calcule chaque ligne. Aucune remise réinventée ici : si le seuil
 * d'éligibilité de `discounts.ts` change un jour, ce module suit
 * automatiquement plutôt que de diverger.
 */
export function computeChecklistPackAmounts(
  membraneSlug: string,
  membraneUnitHtCents: number,
  membraneQuantity: number,
  membraneVatRateBps: number,
  accessories: ChecklistAccessoryInput[],
  checkedSlugs: string[],
  packDiscountBpsRate: number,
): ChecklistPackAmounts {
  const checkedSet = new Set(checkedSlugs);
  const checked = accessories.filter((accessory) => checkedSet.has(accessory.slug));

  const lines: DiscountableCartLine[] = [
    { slug: membraneSlug, quantity: membraneQuantity, source: "pack", packId: CHECKLIST_PACK_ID },
    ...checked.map((accessory) => ({
      slug: accessory.slug,
      quantity: accessory.quantity,
      source: "pack" as const,
      packId: CHECKLIST_PACK_ID,
    })),
  ];
  const manifest: PackManifest = { originalSlugs: lines.map((line) => line.slug) };
  const [discountBps] = computeLineDiscountsBps(lines, { [CHECKLIST_PACK_ID]: manifest }, packDiscountBpsRate);

  const membraneCharge = computeLineChargeFromUnitHt(
    membraneUnitHtCents,
    membraneQuantity,
    discountBps,
    membraneVatRateBps,
  );

  const accessoryCharges: Record<string, LineCharge> = {};
  for (const accessory of accessories) {
    accessoryCharges[accessory.slug] = computeLineChargeFromUnitHt(
      accessory.unitHtCents,
      accessory.quantity,
      checkedSet.has(accessory.slug) ? discountBps : 0,
      accessory.vatRateBps,
    );
  }

  const totalCents =
    membraneCharge.lineTtcCents +
    checked.reduce((sum, accessory) => sum + accessoryCharges[accessory.slug].lineTtcCents, 0);

  return { discountBps, membraneCharge, accessoryCharges, totalCents };
}
