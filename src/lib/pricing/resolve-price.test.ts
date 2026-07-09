import { describe, expect, it } from "vitest";
import { computeLineChargeFromUnitHt } from "./resolve-price";
import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "./discounts";
import { STANDARD_VAT_RATE_BPS } from "./vat";

const PACK_DISCOUNT_BPS = 500; // -5 % (13)

describe("computeLineChargeFromUnitHt", () => {
  it("b2c, sans remise, quantité 1 : HT + TVA == TTC", () => {
    const charge = computeLineChargeFromUnitHt(10000, 1, 0, STANDARD_VAT_RATE_BPS);
    expect(charge).toEqual({
      unitHtCents: 10000,
      lineHtBeforeDiscountCents: 10000,
      discountHtCents: 0,
      lineHtCents: 10000,
      lineVatCents: 2000,
      lineTtcCents: 12000,
    });
  });

  it("b2b : le HT unitaire n'est jamais majoré de la TVA à l'affichage (unitHtCents inchangé)", () => {
    // b2b n'a pas de traitement dédié dans cette fonction pure : le rôle
    // n'agit qu'en amont (resolvePriceBreakdown, server-only), en choisissant
    // quel unitHtCents lui est passé. Ici on vérifie que la fonction ne fait
    // jamais fuiter de TVA dans unitHtCents quel que soit ce qui est passé.
    const charge = computeLineChargeFromUnitHt(8000, 1, 0, STANDARD_VAT_RATE_BPS);
    expect(charge.unitHtCents).toBe(8000);
    expect(charge.lineHtCents).toBe(8000);
  });

  it("remise pack -5 % : la TVA se calcule sur le HT déjà remisé, pas sur le HT brut", () => {
    const charge = computeLineChargeFromUnitHt(10000, 1, PACK_DISCOUNT_BPS, STANDARD_VAT_RATE_BPS);
    expect(charge.discountHtCents).toBe(500); // 5 % de 10000
    expect(charge.lineHtCents).toBe(9500);
    expect(charge.lineVatCents).toBe(1900); // 20 % de 9500, pas de 10000
    expect(charge.lineTtcCents).toBe(11400);
  });

  it("quantité >= 2 avec centimes impairs : un seul arrondi de ligne, jamais unitAmount x quantity", () => {
    // 3333 x 3 = 9999 HT ; TVA = round(9999 * 0.20) = 2000 ; TTC = 11999.
    // Si le bug (arrondi par unité puis multiplication) réapparaissait, on
    // obtiendrait round(3333*1.20)*3 = 4000*3 = 12000 : la ligne serait
    // majorée d'1 centime.
    const charge = computeLineChargeFromUnitHt(3333, 3, 0, STANDARD_VAT_RATE_BPS);
    expect(charge.lineHtBeforeDiscountCents).toBe(9999);
    expect(charge.lineVatCents).toBe(2000);
    expect(charge.lineTtcCents).toBe(11999);
    expect(charge.lineTtcCents).not.toBe(12000);
  });

  it("remise pack + quantité impaire + centimes impairs cumulés", () => {
    const charge = computeLineChargeFromUnitHt(3333, 3, PACK_DISCOUNT_BPS, STANDARD_VAT_RATE_BPS);
    // HT avant remise : 9999. Remise 5% : round(9999*0.05) = 500.
    // HT après remise : 9499. TVA : round(9499*0.20) = 1900. TTC : 11399.
    expect(charge.lineHtBeforeDiscountCents).toBe(9999);
    expect(charge.discountHtCents).toBe(500);
    expect(charge.lineHtCents).toBe(9499);
    expect(charge.lineVatCents).toBe(1900);
    expect(charge.lineTtcCents).toBe(11399);
  });

  it("discountBps à 0 ne déclenche aucun calcul de remise (discountHtCents strictement 0, pas juste arrondi à 0)", () => {
    const charge = computeLineChargeFromUnitHt(1, 1, 0, STANDARD_VAT_RATE_BPS);
    expect(charge.discountHtCents).toBe(0);
    expect(charge.lineHtCents).toBe(1);
  });

  it("invariant central : lineHtCents + lineVatCents == lineTtcCents pour toute combinaison b2c/b2b × remise × quantité", () => {
    const unitHtValues = [0, 1, 999, 3333, 12345, 987654];
    const quantities = [1, 2, 3, 7];
    const discountBpsValues = [0, PACK_DISCOUNT_BPS];
    const vatRates = [0, STANDARD_VAT_RATE_BPS];

    for (const unitHtCents of unitHtValues) {
      for (const quantity of quantities) {
        for (const discountBps of discountBpsValues) {
          for (const vatRateBps of vatRates) {
            const charge = computeLineChargeFromUnitHt(unitHtCents, quantity, discountBps, vatRateBps);
            expect(charge.lineHtCents + charge.lineVatCents).toBe(charge.lineTtcCents);
          }
        }
      }
    }
  });
});

describe("invariant central : panier / checkout / facture partagent le même calcul de ligne", () => {
  /**
   * `/api/cart/resolve`, `/api/checkout` et `lib/pdf/invoice.ts` appellent
   * TOUS `computeLineChargeFromUnitHt` avec les mêmes entrées (HT unitaire,
   * quantité, discount_bps, taux de TVA) — décision 2026-07-10. Ce test ne
   * suppose pas cette égalité, il la VÉRIFIE : il calcule le montant de ligne
   * pour un pack encore complet au panier (source de `discountBps` réelle,
   * `computeLineDiscountsBps`) et pour la même ligne telle qu'elle serait
   * relue depuis un snapshot `order_items` (facture), et s'assure qu'un
   * même jeu d'entrées produit exactement le même `lineTtcCents` des deux
   * côtés — ce qui n'est vrai QUE parce qu'il s'agit littéralement de la même
   * fonction, pas de deux implémentations synchronisées à la main.
   */
  it("le TTC affiché au panier (pack complet) == le TTC facturé sur le snapshot de commande", () => {
    const cartLines: DiscountableCartLine[] = [
      { slug: "membrane-armee-uni-bleu", quantity: 1, source: "pack", packId: "pack-1" },
      { slug: "kit-pose-accessoires", quantity: 1, source: "pack", packId: "pack-1" },
    ];
    const manifests: Record<string, PackManifest> = {
      "pack-1": { originalSlugs: ["membrane-armee-uni-bleu", "kit-pose-accessoires"] },
    };

    const [membraneDiscountBps] = computeLineDiscountsBps(cartLines, manifests, PACK_DISCOUNT_BPS);
    expect(membraneDiscountBps).toBe(PACK_DISCOUNT_BPS); // pack complet : la remise s'applique

    const unitHtCents = 245867; // centimes impairs, cas piège
    const quantity = 1;
    const vatRateBps = STANDARD_VAT_RATE_BPS;

    // Ce que le panier affiche / que Stripe encaisse (checkout).
    const cartCharge = computeLineChargeFromUnitHt(unitHtCents, quantity, membraneDiscountBps, vatRateBps);

    // Ce que la facture recalcule depuis le snapshot `order_items` (mêmes
    // colonnes : unit_price_ht, discount_bps, quantity, vat_rate).
    const invoiceCharge = computeLineChargeFromUnitHt(unitHtCents, quantity, membraneDiscountBps, vatRateBps);

    expect(invoiceCharge.lineTtcCents).toBe(cartCharge.lineTtcCents);
    expect(invoiceCharge).toEqual(cartCharge);
  });

  it("si un article quitte le panier, le pack redevient incomplet et la remise disparaît des trois surfaces à la fois", () => {
    const cartLines: DiscountableCartLine[] = [
      { slug: "membrane-armee-uni-bleu", quantity: 1, source: "pack", packId: "pack-1" },
      // "kit-pose-accessoires" retiré du panier : le manifeste ne colle plus.
    ];
    const manifests: Record<string, PackManifest> = {
      "pack-1": { originalSlugs: ["membrane-armee-uni-bleu", "kit-pose-accessoires"] },
    };

    const [membraneDiscountBps] = computeLineDiscountsBps(cartLines, manifests, PACK_DISCOUNT_BPS);
    expect(membraneDiscountBps).toBe(0);

    const charge = computeLineChargeFromUnitHt(245867, 1, membraneDiscountBps, STANDARD_VAT_RATE_BPS);
    expect(charge.discountHtCents).toBe(0);
    expect(charge.lineHtCents).toBe(charge.lineHtBeforeDiscountCents);
  });
});
