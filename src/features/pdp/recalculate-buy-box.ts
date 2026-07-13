import {
  calculatePack,
  type CalculatorConfig,
  type CalculatorInput,
  type CalculatorResult,
} from "@/features/calculator";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/line-charge";
import type { PdpBuyBoxAmounts } from "./buy-box-pricing";

export interface RecalculatePdpBuyBoxParams {
  config: CalculatorConfig;
  /** `roll_area_m2` du produit membrane (04). */
  membraneRollAreaM2: number;
  /**
   * HT unitaire déjà résolu côté serveur pour CE rôle (`resolvePriceBreakdown`,
   * 28b/29a) — constant tant que le rôle/produit ne changent pas, jamais
   * recalculé ici. b2c : `base_price_ht`. b2b (29b③) : `proUnitHtCents` reçu
   * de `/api/pricing/product-price` — MÊME paramètre, même chaîne, aucune
   * branche de calcul séparée pour le rôle pro.
   */
  unitHtCents: number;
  /**
   * Montant à AFFICHER pour CE rôle, déjà résolu côté serveur
   * (`resolvePriceBreakdown().unitAmountCents`, 28b) — TTC en b2c, HT en b2b
   * (jamais majoré de TVA à l'affichage pour un pro). Fourni tel quel plutôt
   * que recalculé ici : la formule HT→TTC est spécifique au rôle b2c, la
   * reconstruire à partir de `unitHtCents` sans connaître le rôle produirait
   * un montant faux pour un pro (29b③).
   */
  unitAmountCents: number;
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
 * changement de cotes — OU de rôle (29b③, un pro vérifié bascule
 * `unitHtCents`/`unitAmountCents` de public à pro sans changer de fonction).
 * EXACTEMENT la même chaîne que `computePdpBuyBoxAmounts`
 * (`src/features/pdp/buy-box-pricing.ts`, 29a) : `calculatePack()` (08,
 * moteur inchangé) pour la surface/le nombre de rouleaux, puis
 * `computeLineChargeFromUnitHt` (extrait de `resolve-price.ts` dans
 * `line-charge.ts` pour rester importable côté client, 29b) pour le
 * sous-total membrane, puis la même division par la surface couverte pour le
 * €/m² (D6, choix A). Fonction pure et synchrone (aucun accès réseau/DB) :
 * peut tourner à chaque frappe débouncée sans casser le budget INP.
 *
 * `unitHtCents`, `unitAmountCents` et `shippingCents` sont fournis par
 * l'appelant (résolus une fois côté serveur, 29a/29b) — seuls `rollQuantity`
 * et `coveredAreaM2`, qui dépendent des cotes, sont recalculés ici. Le rôle
 * lui-même n'est jamais un paramètre de cette fonction : l'appelant choisit
 * QUELS montants lui passer (publics ou pro, déjà résolus par le serveur),
 * cette fonction ne fait que les faire traverser la même chaîne de ligne.
 */
export function recalculatePdpBuyBoxAmounts(
  input: CalculatorInput,
  {
    config,
    membraneRollAreaM2,
    unitHtCents,
    unitAmountCents,
    vatRateBps,
    shippingCents,
  }: RecalculatePdpBuyBoxParams,
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
