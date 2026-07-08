import "server-only";

import { getBusinessConfigEnv } from "@/lib/env";
import type { PricingRole } from "@/lib/pricing/types";
import { isCorsicaPostalCode } from "./postal-code";

export interface ShippingCartLine {
  sku: string;
  quantity: number;
}

export interface ShippingAddress {
  postalCode: string;
}

export interface ShippingFeeResult {
  amountCents: number;
  corsicaSurchargeApplied: boolean;
}

/** Texte d'affichage blind shipping (12) — jamais de mention APF/transporteur. */
export const SHIPPING_DELAY_LABEL =
  "Expédié par notre partenaire logistique sous 5 à 10 jours ouvrés";

/**
 * Frais de port (12) : une seule interface pilotée par env (`SHIPPING_MODE`)
 * pour basculer entre les deux options tarifaires sans toucher au checkout.
 * `cart`/`role` font déjà partie de la signature en vue d'une éventuelle
 * tarification au poids/volume ou exonération pro (V2, `weight_grams` — 04) ;
 * non utilisés en V1, les deux modes étant indépendants du panier.
 *
 * Surcoût Corse : PROVISOIRE (montant `SHIPPING_CORSICA_SURCHARGE_CENTS`, 26),
 * à confirmer avec APF — appliqué dans les deux modes dès qu'un code postal
 * corse (2A/2B, 20xxx) est connu, `shippingAddress` restant optionnel tant
 * que Stripe Checkout n'a pas encore collecté l'adresse (10).
 */
export function getShippingFee(
  cart: ShippingCartLine[],
  role: PricingRole,
  shippingAddress?: ShippingAddress,
): ShippingFeeResult {
  const env = getBusinessConfigEnv();
  const baseAmountCents = env.SHIPPING_MODE === "flat" ? env.SHIPPING_FLAT_FEE_CENTS : 0;

  const corsicaSurchargeApplied = Boolean(
    shippingAddress && isCorsicaPostalCode(shippingAddress.postalCode),
  );

  const amountCents = corsicaSurchargeApplied
    ? baseAmountCents + env.SHIPPING_CORSICA_SURCHARGE_CENTS
    : baseAmountCents;

  return { amountCents, corsicaSurchargeApplied };
}
