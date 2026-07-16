import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "@/lib/pricing/discounts";
import { computeLineChargeFromUnitHt, type LineCharge } from "@/lib/pricing/line-charge";

export interface ChecklistAccessoryInput {
  slug: string;
  quantity: number;
  unitHtCents: number;
  vatRateBps: number;
}

export interface ChecklistPackAmounts {
  /** `discount_bps` réellement appliqué (13) — 0 tant que le kit n'est pas COMPLET (29c② partie B, tous les accessoires cochés). */
  discountBps: number;
  membraneCharge: LineCharge;
  /** Une entrée par accessoire fourni, coché ou non (non coché : `discountBps = 0`). */
  accessoryCharges: Record<string, LineCharge>;
  /** Membrane + accessoires COCHÉS uniquement. */
  totalCents: number;
}

const CHECKLIST_PACK_ID = "pdp-checklist-preview";

/**
 * Éligibilité du kit (29c② partie B, décision métier tranchée) : la remise
 * ne s'applique QUE si TOUS les accessoires recommandés sont cochés — un
 * seul item coché ne suffit plus (contrairement à la lecture initiale de
 * 29c②, corrigée ici). La quantité n'entre jamais dans cette décision.
 * `allAccessorySlugs` est le kit COMPLET recommandé par le calculateur (08),
 * pas seulement les items cochés — sans accessoire recommandé, aucun kit ne
 * peut jamais se former. Fonction UNIQUE, lue par la buy-box (`discountBps`)
 * ET la checklist (message « remise appliquée ») — pas de copie locale.
 */
export function isChecklistPackFormed(checkedSlugs: string[], allAccessorySlugs: string[]): boolean {
  return allAccessorySlugs.length > 0 && allAccessorySlugs.every((slug) => checkedSlugs.includes(slug));
}

/**
 * Aperçu du pack formé par la checklist de chantier (29c②) — MÊME chaîne que
 * le panier/checkout : `computeLineDiscountsBps` (13, `lib/pricing/discounts.ts`)
 * décide l'éligibilité, `computeLineChargeFromUnitHt` (`line-charge.ts`)
 * calcule chaque ligne. Aucune remise réinventée ici.
 *
 * Correctif 29c② partie B : `manifest.originalSlugs` porte désormais le KIT
 * COMPLET recommandé (membrane + TOUS les accessoires, `accessories`), pas
 * seulement les slugs cochés. Avant ce correctif, le manifeste était
 * auto-référent (`originalSlugs = lines.map(...)`, construit à partir des
 * SEULES lignes déjà cochées) : `isPackComplete` (13, `discounts.ts`) le
 * trouvait donc toujours « complet » dès qu'UN SEUL accessoire était coché —
 * la mécanique 13 (« toutes les `originalSlugs` du manifeste doivent être
 * présentes ») produit la règle voulue SANS nouvelle logique, une fois le
 * manifeste correctement rempli avec le kit entier plutôt qu'avec lui-même.
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
  const manifest: PackManifest = {
    originalSlugs: [membraneSlug, ...accessories.map((accessory) => accessory.slug)],
  };
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
