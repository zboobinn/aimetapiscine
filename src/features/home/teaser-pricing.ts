import {
  defaultCalculatorConfig,
  type CalculatorInput,
} from "@/features/calculator";
import { recalculatePdpBuyBoxAmounts } from "@/features/pdp/recalculate-buy-box";
import { computePublicTtcCents } from "@/lib/pricing/vat";

/**
 * Prix public de la membrane la moins chère du catalogue (30 §03), résolu
 * côté serveur (`cheapest-membrane-pricing.ts`) et porté en donnée plate
 * jusqu'ici — jamais un fetch pro (rôle b2c uniquement, la home est publique).
 */
export interface TeaserMembranePricing {
  unitHtCents: number;
  vatRateBps: number;
  rollAreaM2: number;
}

export interface TeaserPriceResult {
  /** Surface brute (coefficient de perte inclus, 08) — identique à `calculatePack().surface.grossM2`. */
  surfaceM2: number;
  /** « à partir de » : sous-total membrane TTC — MÊME chaîne que la PDP, jamais un `unitAmountCents × qty`. */
  fromPriceTtcCents: number;
}

/**
 * Le teaser calculateur (30 §03) n'est pas une seconde implémentation du
 * calculateur : il appelle EXACTEMENT la même chaîne que la PDP
 * (`recalculatePdpBuyBoxAmounts`, 29b①) — `calculatePack()` (08, moteur
 * inchangé) puis `computeLineChargeFromUnitHt` (`line-charge.ts`) — sans
 * livraison ni remise (le teaser affiche un prix membrane « à partir de »,
 * pas un total de commande, `shippingCents` figé à 0). Fonction pure et
 * synchrone : aucun accès réseau, donc réutilisable dans un Client Component
 * `next/dynamic({ ssr: false })` sans casser le budget de 100 ms (30 §03).
 */
export function computeTeaserPrice(
  input: CalculatorInput,
  pricing: TeaserMembranePricing,
  lossCoeffBase: number,
  lossCoeffStairs: number,
): TeaserPriceResult {
  const config = defaultCalculatorConfig({ lossCoeffBase, lossCoeffStairs });
  const unitAmountCents = computePublicTtcCents(pricing.unitHtCents, pricing.vatRateBps);

  const { surface, buyBox } = recalculatePdpBuyBoxAmounts(input, {
    config,
    membraneRollAreaM2: pricing.rollAreaM2,
    unitHtCents: pricing.unitHtCents,
    unitAmountCents,
    vatRateBps: pricing.vatRateBps,
    shippingCents: 0,
  });

  return { surfaceM2: surface.grossM2, fromPriceTtcCents: buyBox.membraneSubtotalCents };
}
