import "server-only";

import { getBusinessConfigEnv } from "@/lib/env";
import type { PricingRole } from "@/lib/pricing/types";

/**
 * Frais de port (12) : une seule interface pilotée par env (`SHIPPING_MODE`)
 * pour basculer entre les deux options tarifaires (EN ATTENTE, decisions.md)
 * sans toucher au checkout. `role` fait déjà partie de la signature en vue
 * d'une éventuelle exonération pro/volume en V2 — non utilisé en V1, les
 * deux modes étant indépendants du panier.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature figée par 12, `role` sert en V2 (exonération pro/volume)
export function getShippingFee(role: PricingRole): number {
  const env = getBusinessConfigEnv();
  return env.SHIPPING_MODE === "flat" ? env.SHIPPING_FLAT_FEE_CENTS : 0;
}
