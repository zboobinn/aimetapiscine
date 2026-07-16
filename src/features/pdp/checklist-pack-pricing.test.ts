import { describe, expect, it } from "vitest";
import { computeLineDiscountsBps, type DiscountableCartLine, type PackManifest } from "@/lib/pricing/discounts";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import { STANDARD_VAT_RATE_BPS } from "@/lib/pricing/vat";
import { computeChecklistPackAmounts, isChecklistPackFormed } from "./checklist-pack-pricing";

const PACK_DISCOUNT_BPS = 500; // -5 % (13)
const MEMBRANE_SLUG = "membrane-armee-uni-bleu";
const COLLE_SLUG = "colle-pvc";
const PROFILE_SLUG = "profile-finition";
const KIT_SLUGS = [COLLE_SLUG, PROFILE_SLUG];

describe("isChecklistPackFormed (29c② partie B — kit complet uniquement)", () => {
  it("aucun item coché : pack non formé", () => {
    expect(isChecklistPackFormed([], KIT_SLUGS)).toBe(false);
  });

  it("un seul item coché sur un kit de 2 : pack NON formé — un item ne suffit plus (décision métier)", () => {
    expect(isChecklistPackFormed([COLLE_SLUG], KIT_SLUGS)).toBe(false);
    expect(isChecklistPackFormed([PROFILE_SLUG], KIT_SLUGS)).toBe(false);
  });

  it("TOUS les items du kit cochés : pack formé", () => {
    expect(isChecklistPackFormed([COLLE_SLUG, PROFILE_SLUG], KIT_SLUGS)).toBe(true);
    // Ordre indifférent.
    expect(isChecklistPackFormed([PROFILE_SLUG, COLLE_SLUG], KIT_SLUGS)).toBe(true);
  });

  it("aucun accessoire recommandé (kit vide) : jamais formé, même avec des slugs cochés parasites", () => {
    expect(isChecklistPackFormed(["autre-chose"], [])).toBe(false);
  });
});

describe("computeChecklistPackAmounts", () => {
  it("aucun accessoire coché : discountBps = 0, la membrane est facturée plein tarif", () => {
    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      101300,
      2,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: 3, unitHtCents: 1499, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: 5, unitHtCents: 890, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
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

  it("kit PARTIELLEMENT coché (1 accessoire sur 2) : discountBps = 0, total = plein tarif membrane + l'accessoire coché SANS remise (29c② partie B, correctif de la décision « 1 item suffisait »)", () => {
    const membraneUnitHtCents = 101317; // centimes impairs
    const membraneQuantity = 3;
    const colleUnitHtCents = 1499;
    const colleQuantity = 3;
    const profileUnitHtCents = 890;
    const profileQuantity = 5;

    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: profileQuantity, unitHtCents: profileUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG], // un seul des deux accessoires du kit
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(0);

    const expectedMembraneCharge = computeLineChargeFromUnitHt(
      membraneUnitHtCents,
      membraneQuantity,
      0,
      STANDARD_VAT_RATE_BPS,
    );
    const expectedColleCharge = computeLineChargeFromUnitHt(
      colleUnitHtCents,
      colleQuantity,
      0,
      STANDARD_VAT_RATE_BPS,
    );
    expect(result.membraneCharge).toEqual(expectedMembraneCharge);
    expect(result.accessoryCharges[COLLE_SLUG]).toEqual(expectedColleCharge);
    // Le profilé n'est pas coché : présent dans `accessoryCharges` (prix de référence) mais absent du total.
    expect(result.accessoryCharges[PROFILE_SLUG]).toEqual(
      computeLineChargeFromUnitHt(profileUnitHtCents, profileQuantity, 0, STANDARD_VAT_RATE_BPS),
    );
    // Total = membrane plein tarif + colle plein tarif, jamais le profilé (pas coché).
    expect(result.totalCents).toBe(expectedMembraneCharge.lineTtcCents + expectedColleCharge.lineTtcCents);
  });

  it("kit COMPLET coché (les 2 accessoires) : le vrai discountBps traverse computeLineChargeFromUnitHt pour la membrane ET les deux accessoires, aux centimes impairs", () => {
    const membraneUnitHtCents = 101317;
    const membraneQuantity = 3;
    const colleUnitHtCents = 1499;
    const colleQuantity = 3;
    const profileUnitHtCents = 887;
    const profileQuantity = 5;

    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: profileQuantity, unitHtCents: profileUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG, PROFILE_SLUG], // kit complet
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(PACK_DISCOUNT_BPS);

    const expectedMembraneCharge = computeLineChargeFromUnitHt(
      membraneUnitHtCents,
      membraneQuantity,
      PACK_DISCOUNT_BPS,
      STANDARD_VAT_RATE_BPS,
    );
    const expectedColleCharge = computeLineChargeFromUnitHt(
      colleUnitHtCents,
      colleQuantity,
      PACK_DISCOUNT_BPS,
      STANDARD_VAT_RATE_BPS,
    );
    const expectedProfileCharge = computeLineChargeFromUnitHt(
      profileUnitHtCents,
      profileQuantity,
      PACK_DISCOUNT_BPS,
      STANDARD_VAT_RATE_BPS,
    );
    expect(result.membraneCharge).toEqual(expectedMembraneCharge);
    expect(result.accessoryCharges[COLLE_SLUG]).toEqual(expectedColleCharge);
    expect(result.accessoryCharges[PROFILE_SLUG]).toEqual(expectedProfileCharge);

    expect(result.totalCents).toBe(
      expectedMembraneCharge.lineTtcCents + expectedColleCharge.lineTtcCents + expectedProfileCharge.lineTtcCents,
    );

    // Preuve anti-régression : la ligne remisée ne doit JAMAIS être une simple
    // multiplication du prix unitaire déjà arrondi (arrondi par ligne, docs/decisions.md 2026-07-10).
    const naiveMembraneTotal =
      Math.round((membraneUnitHtCents * (10000 - PACK_DISCOUNT_BPS)) / 10000 / membraneQuantity) *
      membraneQuantity;
    expect(expectedMembraneCharge.lineHtCents).not.toBe(naiveMembraneTotal);
  });

  it("kit complet coché mais quantités MODIFIÉES (≠ recommandées) : la remise reste appliquée — la quantité n'affecte jamais l'éligibilité (29c② partie B, étape 2)", () => {
    const membraneUnitHtCents = 101317;
    const membraneQuantity = 3;
    // Quantités choisies très différentes des « recommandées » d'un calculateur
    // hypothétique — peu importe ici, ce module ne connaît que la quantité
    // finale transmise par l'appelant.
    const colleQuantity = 11;
    const profileQuantity = 1;

    const result = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: 1499, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: profileQuantity, unitHtCents: 887, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG, PROFILE_SLUG],
      PACK_DISCOUNT_BPS,
    );

    expect(result.discountBps).toBe(PACK_DISCOUNT_BPS);
    expect(result.accessoryCharges[COLLE_SLUG].discountHtCents).toBeGreaterThan(0);
    expect(result.accessoryCharges[PROFILE_SLUG].discountHtCents).toBeGreaterThan(0);
  });

  it("de bout en bout, kit PARTIEL : le total affiché == ce que le panier facturera pour les mêmes lignes (simulation indépendante de la chaîne panier, plein tarif des deux côtés)", () => {
    const membraneUnitHtCents = 98765;
    const membraneQuantity = 2;
    const colleUnitHtCents = 3333;
    const colleQuantity = 4;
    const profileUnitHtCents = 887;
    const profileQuantity = 5;

    const checklistResult = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: profileQuantity, unitHtCents: profileUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG], // partiel : seule la colle est cochée
      PACK_DISCOUNT_BPS,
    );

    // Simule EXACTEMENT ce que le panier facture pour les MÊMES lignes
    // réellement envoyées (29c② partie B : un kit partiel n'est JAMAIS
    // envoyé via `addPackLines`, cf. décision côté ATC — la membrane et
    // l'accessoire coché partent comme lignes catalogue indépendantes,
    // `source: "catalog"`, jamais de `packId`/manifeste).
    const cartLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: membraneQuantity, source: "catalog" },
      { slug: COLLE_SLUG, quantity: colleQuantity, source: "catalog" },
    ];
    const [membraneDiscountBps, colleDiscountBps] = computeLineDiscountsBps(cartLines, {}, PACK_DISCOUNT_BPS);

    expect(membraneDiscountBps).toBe(0);
    expect(colleDiscountBps).toBe(0);

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
    expect(checklistResult.discountBps).toBe(0);
  });

  it("de bout en bout, kit COMPLET : le total remisé == le total panier, au centime, centimes impairs (même mécanisme d'éligibilité, discounts.ts, que /api/cart/resolve)", () => {
    const membraneUnitHtCents = 98765;
    const membraneQuantity = 2;
    const colleUnitHtCents = 3333;
    const colleQuantity = 4;
    const profileUnitHtCents = 887;
    const profileQuantity = 5;

    const checklistResult = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      membraneUnitHtCents,
      membraneQuantity,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: colleQuantity, unitHtCents: colleUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: profileQuantity, unitHtCents: profileUnitHtCents, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG, PROFILE_SLUG], // kit complet
      PACK_DISCOUNT_BPS,
    );

    // Simule EXACTEMENT ce que `addPackLines` (store panier, 09) puis
    // `/api/cart/resolve` (13) calculeraient pour ce même pack ajouté au
    // panier — `addPackLines` dérive `originalSlugs` DES LIGNES ENVOYÉES
    // (`store.ts`) : reproduit ici en envoyant le KIT COMPLET, exactement ce
    // que l'ATC (29c② partie B) envoie désormais quand le kit est complet.
    const packId = "real-cart-pack-id";
    const cartLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: membraneQuantity, source: "pack", packId },
      { slug: COLLE_SLUG, quantity: colleQuantity, source: "pack", packId },
      { slug: PROFILE_SLUG, quantity: profileQuantity, source: "pack", packId },
    ];
    const manifests: Record<string, PackManifest> = {
      [packId]: { originalSlugs: [MEMBRANE_SLUG, COLLE_SLUG, PROFILE_SLUG] },
    };
    const [membraneDiscountBps, colleDiscountBps, profileDiscountBps] = computeLineDiscountsBps(
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
    const cartProfileCharge = computeLineChargeFromUnitHt(
      profileUnitHtCents,
      profileQuantity,
      profileDiscountBps,
      STANDARD_VAT_RATE_BPS,
    );
    const cartTotalCents = cartMembraneCharge.lineTtcCents + cartColleCharge.lineTtcCents + cartProfileCharge.lineTtcCents;

    expect(checklistResult.totalCents).toBe(cartTotalCents);
    expect(checklistResult.discountBps).toBe(membraneDiscountBps);
    expect(checklistResult.discountBps).toBe(colleDiscountBps);
    expect(checklistResult.discountBps).toBe(profileDiscountBps);
    expect(checklistResult.discountBps).toBe(PACK_DISCOUNT_BPS);
  });

  it("piège auto-référence corrigé : un manifeste construit à partir des SEULES lignes cochées (ancien bug) aurait donné une remise dès 1 item — vérifié que ce n'est plus le cas ici", () => {
    // Reproduit l'ANCIEN bug pour prouver le contraste : un manifeste
    // auto-référent (originalSlugs = lignes déjà cochées) trouve toujours le
    // pack "complet" puisqu'il se compare à lui-même.
    const buggyManifest: PackManifest = { originalSlugs: [MEMBRANE_SLUG, COLLE_SLUG] };
    const buggyLines: DiscountableCartLine[] = [
      { slug: MEMBRANE_SLUG, quantity: 1, source: "pack", packId: "buggy" },
      { slug: COLLE_SLUG, quantity: 1, source: "pack", packId: "buggy" },
    ];
    const [buggyDiscountBps] = computeLineDiscountsBps(buggyLines, { buggy: buggyManifest }, PACK_DISCOUNT_BPS);
    expect(buggyDiscountBps).toBe(PACK_DISCOUNT_BPS); // preuve du bug reproduit isolément

    // Le module réel, lui, construit le manifeste avec le KIT COMPLET
    // (membrane + tous les accessoires), pas seulement ceux cochés : un seul
    // accessoire coché sur un kit de 2 ne peut plus jamais déclencher la remise.
    const fixedResult = computeChecklistPackAmounts(
      MEMBRANE_SLUG,
      101300,
      1,
      STANDARD_VAT_RATE_BPS,
      [
        { slug: COLLE_SLUG, quantity: 1, unitHtCents: 1499, vatRateBps: STANDARD_VAT_RATE_BPS },
        { slug: PROFILE_SLUG, quantity: 1, unitHtCents: 890, vatRateBps: STANDARD_VAT_RATE_BPS },
      ],
      [COLLE_SLUG],
      PACK_DISCOUNT_BPS,
    );
    expect(fixedResult.discountBps).toBe(0);
  });
});
