import { describe, expect, it } from "vitest";
import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "@/lib/pricing/discounts";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import { STANDARD_VAT_RATE_BPS } from "@/lib/pricing/vat";
import { computeChecklistPackAmounts, isChecklistPackFormed } from "./checklist-pack-pricing";

describe("isChecklistPackFormed", () => {
  it("aucun item coché : pack non formé", () => {
    expect(isChecklistPackFormed([])).toBe(false);
  });

  it("au moins un item coché : pack formé (membrane + 1 accessoire = seuil de 13)", () => {
    expect(isChecklistPackFormed(["colle-pvc"])).toBe(true);
    expect(isChecklistPackFormed(["colle-pvc", "profile-finition"])).toBe(true);
  });
});

const PACK_DISCOUNT_BPS = 500; // -5 % (13)
const MEMBRANE_SLUG = "membrane-armee-uni-bleu";
const COLLE_SLUG = "colle-pvc";
const PROFILE_SLUG = "profile-finition";

describe("computeChecklistPackAmounts", () => {
  it("aucun accessoire coché : discountBps = 0, la membrane est facturée plein tarif", () => {
    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      101300,
      2,
      STANDARD_VAT_RATE_BPS,
      [{ slug: COLLE_SLUG, quantity: 3, unitHtCents: 1499, vatRateBps: STANDARD_VAT_RATE_BPS }],
      [],
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(0);
    expect(result.membraneCharge).toEqual(
      computeLineChargeFromUnitHt(101300, 2, 0, STANDARD_VAT_RATE_BPS),
    );
    expect(result.accessoryCharges[COLLE_SLUG]).toEqual(
      computeLineChargeFromUnitHt(1499, 3, 0, STANDARD_VAT_RATE_BPS),
    );
    expect(result.totalCents).toBe(result.membraneCharge.lineTtcCents);
  });

  it("un item coché forme un pack complet (membrane + 1 accessoire) : le vrai discountBps traverse computeLineChargeFromUnitHt pour la membrane ET l'accessoire coché, aux centimes impairs", () => {
    // HT à centimes impairs choisis pour piéger un arrondi unité×quantité au lieu d'un arrondi de ligne.
    const membraneUnitHtCents = 101300;
    const membraneQuantity = 3;
    const colleUnitHtCents = 1499;
    const colleQuantity = 3;

    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: 5, unitHtCents: 890, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG],
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(PACK_DISCOUNT_BPS);

    const expectedMembraneCharge = computeLineChargeFromUnitHt(
      membraneUnitHtCents,
      membraneQuantity,
      PACK_DISCOUNT_BPS,
      STANDARD_VAT_RATE_BPS,
    );
    expect(result.membraneCharge).toEqual(expectedMembraneCharge);

    const expectedColleCharge = computeLineChargeFromUnitHt(
      colleUnitHtCents,
      colleQuantity,
      PACK_DISCOUNT_BPS,
      STANDARD_VAT_RATE_BPS,
    );
    expect(result.accessoryCharges[COLLE_SLUG]).toEqual(expectedColleCharge);

    // Le profilé n'est pas coché : jamais remisé, même si le pack est actif pour les autres lignes.
    expect(result.accessoryCharges[PROFILE_SLUG]).toEqual(
      computeLineChargeFromUnitHt(890, 5, 0, STANDARD_VAT_RATE_BPS),
    );

    expect(result.totalCents).toBe(
      expectedMembraneCharge.lineTtcCents + expectedColleCharge.lineTtcCents,
    );

    // Preuve anti-régression : la ligne remisée ne doit JAMAIS être une simple
    // multiplication du prix unitaire déjà arrondi (arrondi par ligne, docs/decisions.md 2026-07-10).
    const naiveMembraneTotal =
      Math.round((membraneUnitHtCents * (10000 - PACK_DISCOUNT_BPS)) / 10000 / membraneQuantity) *
      membraneQuantity;
    expect(expectedMembraneCharge.lineHtCents).not.toBe(naiveMembraneTotal);
  });

  it("de bout en bout : le total affiché == ce que le panier facturera pour le MÊME pack (même mécanisme d'éligibilité, discounts.ts, que /api/cart/resolve)", () => {
    const membraneUnitHtCents = 98765;
    const membraneQuantity = 2;
    const colleUnitHtCents = 3333;
    const colleQuantity = 4;

    const checklistResult = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [{ slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS }],
      [COLLE_SLUG],
      PACK_DISCOUNT_BPS,
    );

    // Simule EXACTEMENT ce que `addPackLines` (store panier, 09) puis
    // `/api/cart/resolve` (13) calculeraient pour ce même pack ajouté au panier.
    const packId = "real-cart-pack-id";
    const cartLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: membraneQuantity, source: "pack", packId },
      { slug: COLLE_SLUG, quantity: colleQuantity, source: "pack", packId },
    ];
    const manifests: Record<string, PackManifest> = {
      [packId]: { originalSlugs: [MEMBRANE_SLUG, COLLE_SLUG] },
    };
    const [membraneDiscountBps, colleDiscountBps] = computeLineDiscountsBps(
      cartLines,
      manifests,
      PACK_DISCOUNT_BPS,
    );

    const cartMembraneCharge = computeLineChargeFromUnitHt(
      membraneUnitHtCents,
      membraneQuantity,
      membraneDiscountBps,
      STANDARD_VAT_RATE_BPS,
    );
    const cartColleCharge = computeLineChargeFromUnitHt(
      colleUnitHtCents,
      colleQuantity,
      colleDiscountBps,
      STANDARD_VAT_RATE_BPS,
    );
    const cartTotalCents = cartMembraneCharge.lineTtcCents + cartColleCharge.lineTtcCents;

    expect(checklistResult.totalCents).toBe(cartTotalCents);
    expect(checklistResult.discountBps).toBe(membraneDiscountBps);
    expect(checklistResult.discountBps).toBe(colleDiscountBps);
  });

  it("un seul accessoire fourni, jamais coché : le pack reste incomplet (< 2 slugs), jamais de remise même si l'appelant se trompe de seuil", () => {
    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      100000,
      1,
      STANDARD_VAT_RATE_BPS,
      [{ slug: COLLE_SLUG, quantity: 1, unitHtCents: 1500, vatRateBps: STANDARD_VAT_RATE_BPS }],
      [],
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(0);
  });
});
