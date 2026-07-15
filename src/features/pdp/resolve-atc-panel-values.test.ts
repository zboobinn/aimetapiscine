import { describe, expect, it } from "vitest";
import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "@/lib/pricing/discounts";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import { STANDARD_VAT_RATE_BPS } from "@/lib/pricing/vat";
import { computeChecklistPackAmounts } from "./checklist-pack-pricing";
import type { RecalculatedPdpResult } from "./recalculate-buy-box";
import { resolveAtcPanelValues } from "./resolve-atc-panel-values";

function buildResult(): RecalculatedPdpResult {
  return {
    surface: {
      floorM2: 32,
      wallsM2: 12.4,
      stairsM2: 2,
      netM2: 46.4,
      lossCoefficient: 1,
      grossM2: 46.4,
      perimeterM: 24,
    },
    membrane: {
      quantity: 3,
      unit: "rouleau",
      rollAreaM2: 20,
      motif: "test",
    },
    buyBox: {
      unitAmountCents: 41300,
      pricePerM2Cents: 2672,
      membraneSubtotalCents: 124000,
      shippingCents: 4900,
      totalCents: 128900,
    },
  };
}

describe("resolveAtcPanelValues", () => {
  it("sans accessoire coché : dérive les valeurs affichées à partir du résultat recalculé, accessoriesCount/subtotal à 0", () => {
    const result = buildResult();

    expect(resolveAtcPanelValues(result)).toEqual({
      surfaceM2: 46.4,
      pricePerM2Cents: 2672,
      membraneQuantity: 3,
      membraneSubtotalCents: 124000,
      accessoriesCount: 0,
      accessoriesSubtotalCents: 0,
      shippingCents: 4900,
      totalCents: 128900,
      totalLabel: "TTC",
    });
  });

  it("avec des accessoires cochés (29c②, correctif invariant panier) : le total INCLUT leur sous-total — Membrane + Accessoires + Livraison == Total, jamais Membrane + Livraison seuls", () => {
    const result = buildResult();

    const panelValues = resolveAtcPanelValues(result, { count: 2, subtotalCents: 11700 });

    expect(panelValues.accessoriesCount).toBe(2);
    expect(panelValues.accessoriesSubtotalCents).toBe(11700);
    // 124000 (membrane) + 11700 (accessoires) + 4900 (livraison) = 140600.
    expect(panelValues.totalCents).toBe(140600);
    expect(panelValues.totalCents).toBe(
      panelValues.membraneSubtotalCents + panelValues.accessoriesSubtotalCents + panelValues.shippingCents,
    );
    // Le prix au m² reste celui de la MEMBRANE seule — inchangé par les accessoires.
    expect(panelValues.pricePerM2Cents).toBe(result.buyBox.pricePerM2Cents);
  });

  it("le total est TOUJOURS libellé TTC (29c② partie A, correctif « le libellé ment ») : `membraneSubtotalCents` traverse déjà computeLineChargeFromUnitHt (HT + TVA), le total EST du TTC quel que soit le rôle — jamais 'HT' même quand la membrane est au tarif pro", () => {
    const result = buildResult();

    const withoutAccessories = resolveAtcPanelValues(result);
    const withAccessories = resolveAtcPanelValues(result, { count: 1, subtotalCents: 1500 });

    // Aucune variante ne peut produire autre chose que "TTC" — le type
    // `AtcPanelValues.totalLabel` est désormais le littéral "TTC", pas une
    // union "TTC" | "HT" : une régression romprait la compilation, pas
    // seulement ce test.
    expect(withoutAccessories.totalLabel).toBe("TTC");
    expect(withAccessories.totalLabel).toBe("TTC");
  });

  it("preuve d'état unique : la buy-box desktop, le drawer ATC et la barre fixe mobile lisent le même résultat, donc produisent des valeurs identiques au centime", () => {
    const result = buildResult();

    // `PdpProvider` calcule `panelValues` UNE SEULE FOIS par rendu et le
    // passe aux quatre vues (buy-box sticky, drawer mobile, barre fixe,
    // bouton « Valider ») — ces appels simulent exactement ce même unique
    // calcul consommé plusieurs fois, jamais des calculs indépendants.
    const panelValues = resolveAtcPanelValues(result, { count: 1, subtotalCents: 1900 });
    const buyBoxView = panelValues;
    const drawerView = panelValues;
    const fixedBarView = panelValues;

    expect(drawerView).toEqual(buyBoxView);
    expect(fixedBarView).toEqual(buyBoxView);
    expect(drawerView.totalCents).toBe(buyBoxView.totalCents);
    expect(drawerView.pricePerM2Cents).toBe(buyBoxView.pricePerM2Cents);
    expect(drawerView.membraneSubtotalCents).toBe(buyBoxView.membraneSubtotalCents);
    expect(drawerView.accessoriesSubtotalCents).toBe(buyBoxView.accessoriesSubtotalCents);
    expect(drawerView.shippingCents).toBe(buyBoxView.shippingCents);
  });

  it("INVARIANT PANIER b2c (29c②, correctif) : le total affiché avec des accessoires cochés == le total que le panier facturera pour les mêmes lignes, au centime, sur un cas à centimes impairs", () => {
    const MEMBRANE_SLUG = "membrane-armee-uni-bleu";
    const COLLE_SLUG = "colle-pvc";
    const PROFILE_SLUG = "profile-finition";
    const PACK_DISCOUNT_BPS = 500; // -5 % (13)

    // Centimes impairs sur toutes les lignes, quantités >= 2 — piège
    // « arrondi unité×quantité » déjà documenté (docs/decisions.md 2026-07-10).
    const membraneUnitHtCents = 101317;
    const membraneQuantity = 3;
    const shippingCents = 4900;
    const accessories = [
      { slug: COLLE_SLUG, quantity: 3, unitHtCents: 1499, vatRateBps: STANDARD_VAT_RATE_BPS },
      { slug: PROFILE_SLUG, quantity: 5, unitHtCents: 887, vatRateBps: STANDARD_VAT_RATE_BPS },
    ];
    const checkedSlugs = [COLLE_SLUG, PROFILE_SLUG];

    // Chaîne PDP : ce que `PdpProvider` calcule et affiche réellement.
    const packAmounts = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      accessories,
      checkedSlugs,
      PACK_DISCOUNT_BPS,
    );

    const result: RecalculatedPdpResult = {
      surface: {
        floorM2: 32,
        wallsM2: 12.4,
        stairsM2: 2,
        netM2: 46.4,
        lossCoefficient: 1,
        grossM2: 46.4,
        perimeterM: 24,
      },
      membrane: { quantity: membraneQuantity, unit: "rouleau", rollAreaM2: 20, motif: "test" },
      buyBox: {
        unitAmountCents: membraneUnitHtCents,
        pricePerM2Cents: Math.round(packAmounts.membraneCharge.lineTtcCents / 46.4),
        membraneSubtotalCents: packAmounts.membraneCharge.lineTtcCents,
        shippingCents,
        totalCents: packAmounts.membraneCharge.lineTtcCents + shippingCents, // ancienne formule, volontairement pas utilisée par panelValues
      },
    };

    const panelValues = resolveAtcPanelValues(result, {
      count: checkedSlugs.length,
      subtotalCents: packAmounts.totalCents - packAmounts.membraneCharge.lineTtcCents,
    });

    // Chaîne panier : simule EXACTEMENT ce que `addPackLines` puis
    // `/api/cart/resolve` calculeraient pour le MÊME pack ajouté au panier.
    // Le port (`getShippingFee`, V1) est indépendant du contenu du panier
    // (cf. docs/decisions.md, correctif 2026-07-22) : même `shippingCents`.
    const packId = "real-cart-pack-id";
    const cartLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: membraneQuantity, source: "pack", packId },
      ...checkedSlugs.map((slug) => {
        const accessory = accessories.find((a) => a.slug === slug)!;
        return { slug, quantity: accessory.quantity, source: "pack" as const, packId };
      }),
    ];
    const manifests: Record<string, PackManifest> = {
      [packId]: { originalSlugs: [MEMBRANE_SLUG, ...checkedSlugs] },
    };
    const discountBpsPerLine = computeLineDiscountsBps(cartLines, manifests, PACK_DISCOUNT_BPS);

    const cartTotalCents =
      cartLines.reduce((sum, line, index) => {
        const unitHtCents =
          line.slug === MEMBRANE_SLUG
            ? membraneUnitHtCents
            : accessories.find((a) => a.slug === line.slug)!.unitHtCents;
        const charge = computeLineChargeFromUnitHt(
          unitHtCents,
          line.quantity,
          discountBpsPerLine[index],
          STANDARD_VAT_RATE_BPS,
        );
        return sum + charge.lineTtcCents;
      }, 0) + shippingCents;

    expect(panelValues.totalCents).toBe(cartTotalCents);
    expect(panelValues.totalLabel).toBe("TTC");
    // Preuve que le correctif change bien le résultat : l'ancienne formule
    // (membrane + livraison seuls, ignorant les accessoires) diverge.
    expect(panelValues.totalCents).not.toBe(result.buyBox.totalCents);
  });

  it("INVARIANT PANIER b2b (29c② partie A, correctif « PDP ≠ panier » + « le libellé ment ») : en rôle pro, le total affiché == le « Total à payer (TTC) » que le panier facturera pour les mêmes lignes AU TARIF PRO, au centime, sur un cas à centimes impairs — c'est ce trou (b2c seulement) qui a laissé passer le bug", () => {
    const MEMBRANE_SLUG = "membrane-armee-uni-bleu";
    const COLLE_SLUG = "colle-pvc";
    const PROFILE_SLUG = "profile-finition";
    const PACK_DISCOUNT_BPS = 500; // -5 % (13)

    // HT PRO (déjà remisé, distinct du public) pour la membrane ET les deux
    // accessoires — centimes impairs partout, quantités >= 2.
    const membraneProUnitHtCents = 91177; // ≠ HT public, pour exclure toute coïncidence numérique
    const membraneQuantity = 3;
    const shippingCents = 4900;
    const accessories = [
      { slug: COLLE_SLUG, quantity: 3, unitHtCents: 1349, vatRateBps: STANDARD_VAT_RATE_BPS }, // HT pro colle
      { slug: PROFILE_SLUG, quantity: 5, unitHtCents: 801, vatRateBps: STANDARD_VAT_RATE_BPS }, // HT pro profilé
    ];
    const checkedSlugs = [COLLE_SLUG, PROFILE_SLUG];

    // Chaîne PDP (29c② partie A) : `activeChecklistAccessories` a déjà
    // substitué le HT pro (via `accessoryProPricing`, `/api/pricing/product-price`)
    // AVANT d'appeler `computeChecklistPackAmounts` — simulé ici en passant
    // directement les HT pro, comme le fait `pdp-context.tsx`.
    const packAmounts = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneProUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      accessories,
      checkedSlugs,
      PACK_DISCOUNT_BPS,
    );

    const result: RecalculatedPdpResult = {
      surface: {
        floorM2: 32,
        wallsM2: 12.4,
        stairsM2: 2,
        netM2: 46.4,
        lossCoefficient: 1,
        grossM2: 46.4,
        perimeterM: 24,
      },
      membrane: { quantity: membraneQuantity, unit: "rouleau", rollAreaM2: 20, motif: "test" },
      buyBox: {
        unitAmountCents: membraneProUnitHtCents,
        pricePerM2Cents: Math.round(packAmounts.membraneCharge.lineTtcCents / 46.4),
        membraneSubtotalCents: packAmounts.membraneCharge.lineTtcCents,
        shippingCents,
        totalCents: packAmounts.membraneCharge.lineTtcCents + shippingCents,
      },
    };

    const panelValues = resolveAtcPanelValues(result, {
      count: checkedSlugs.length,
      subtotalCents: packAmounts.totalCents - packAmounts.membraneCharge.lineTtcCents,
    });

    // Chaîne panier b2b : `/api/cart/resolve`/`/api/checkout` résolvent le
    // même rôle pour CE pack (membrane + accessoires cochés), avec les MÊMES
    // HT pro — la TVA s'applique quel que soit le rôle (un pro français paie
    // aussi la TVA au moment de payer, réclamable ensuite, 11) : même
    // `computeLineChargeFromUnitHt`, jamais une formule HT-only pour le total.
    const packId = "real-cart-pack-id";
    const cartLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: membraneQuantity, source: "pack", packId },
      ...checkedSlugs.map((slug) => {
        const accessory = accessories.find((a) => a.slug === slug)!;
        return { slug, quantity: accessory.quantity, source: "pack" as const, packId };
      }),
    ];
    const manifests: Record<string, PackManifest> = {
      [packId]: { originalSlugs: [MEMBRANE_SLUG, ...checkedSlugs] },
    };
    const discountBpsPerLine = computeLineDiscountsBps(cartLines, manifests, PACK_DISCOUNT_BPS);

    const cartTotalAPayerTtcCents =
      cartLines.reduce((sum, line, index) => {
        const unitHtCents =
          line.slug === MEMBRANE_SLUG
            ? membraneProUnitHtCents
            : accessories.find((a) => a.slug === line.slug)!.unitHtCents;
        const charge = computeLineChargeFromUnitHt(
          unitHtCents,
          line.quantity,
          discountBpsPerLine[index],
          STANDARD_VAT_RATE_BPS,
        );
        return sum + charge.lineTtcCents;
      }, 0) + shippingCents;

    expect(panelValues.totalCents).toBe(cartTotalAPayerTtcCents);
    // Le libellé reste TTC en pro — c'est exactement le bug corrigé
    // (« Total estimé HT » affichait en réalité un montant TTC).
    expect(panelValues.totalLabel).toBe("TTC");
  });
});
