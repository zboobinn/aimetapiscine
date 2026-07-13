import {
  calculatePack,
  type CalculatorConfig,
  type CalculatorInput,
  type CalculatorResult,
} from "@/features/calculator";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import type { PdpBuyBoxAmounts } from "./buy-box-pricing";

export interface RecalculatePdpBuyBoxParams {
  config: CalculatorConfig;
  /** `roll_area_m2` du produit membrane (04). */
  membraneRollAreaM2: number;
  /** HT unitaire déjà résolu côté serveur pour ce rôle (`resolvePriceBreakdown`, 28b/29a) — constant tant que le rôle/produit ne changent pas, jamais recalculé ici. */
  unitHtCents: number;
  vatRateBps: number;
  /**
   * Livraison (12) : `getShippingFee()` est `server-only` (lit
   * `SHIPPING_MODE`/`SHIPPING_FLAT_FEE_CENTS` via `getBusinessConfigEnv()`)
   * et, en V1, indépendante de la quantité (`cart`/`role` non utilisés,
   * cf. `src/lib/shipping/get-shipping-fee.ts`) — donc constante sur toute
   * la durée de vie du calculateur inline. Reçue en prop depuis le rendu
   * serveur initial (29a), jamais recalculée côté client.
   */
  shippingCents: number;
}

export interface RecalculatedPdpResult {
  surface: CalculatorResult["surface"];
  membrane: CalculatorResult["membrane"];
  buyBox: PdpBuyBoxAmounts;
}

/**
 * Recalcule les 4 valeurs de la buy-box PDP (29b) en réaction à un
 * changement de cotes, EXACTEMENT selon la même chaîne que
 * `computePdpBuyBoxAmounts` (`src/features/pdp/buy-box-pricing.ts`, 29a) :
 * `calculatePack()` (08, moteur inchangé) pour la surface/le nombre de
 * rouleaux, puis `computeLineChargeFromUnitHt` (extrait de `resolve-price.ts`
 * dans `line-charge.ts` pour rester importable côté client, 29b) pour le
 * sous-total membrane, puis la même division par la surface couverte pour le
 * €/m² (D6, choix A). Fonction pure et synchrone (aucun accès réseau/DB) :
 * peut tourner à chaque frappe débouncée sans casser le budget INP.
 *
 * `unitHtCents` et `shippingCents` sont fournis par l'appelant (résolus une
 * fois côté serveur, 29a) et ne varient jamais avec les cotes dans cette
 * passe (rôle figé "b2c", livraison forfaitaire V1) — seuls `rollQuantity`
 * et `coveredAreaM2`, qui dépendent des cotes, sont recalculés ici.
 */
export function recalculatePdpBuyBoxAmounts(
  input: CalculatorInput,
  { config, membraneRollAreaM2, unitHtCents, vatRateBps, shippingCents }: RecalculatePdpBuyBoxParams,
): RecalculatedPdpResult {
  const { surface, membrane } = calculatePack({
    input,
    config,
    membraneRollAreaM2,
    accessoryProducts: [],
  });

  const { lineTtcCents: membraneSubtotalCents } = computeLineChargeFromUnitHt(
    unitHtCents,
    membrane.quantity,
    0,
    vatRateBps,
  );

  const pricePerM2Cents =
    surface.grossM2 > 0 ? Math.round(membraneSubtotalCents / surface.grossM2) : null;

  const unitAmountCents = computePublicTtcCents(unitHtCents, vatRateBps);

  return {
    surface,
    membrane,
    buyBox: {
      unitAmountCents,
      pricePerM2Cents,
      membraneSubtotalCents,
      shippingCents,
      totalCents: membraneSubtotalCents + shippingCents,
    },
  };
}
