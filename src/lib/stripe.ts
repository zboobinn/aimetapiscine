import "server-only";
import Stripe from "stripe";

import { getStripeEnv } from "@/lib/env";

/**
 * Instance unique du client Stripe (10) : clé secrète serveur uniquement,
 * jamais importée depuis un composant client. `apiVersion` figée pour éviter
 * qu'une mise à jour du SDK ne change silencieusement le contrat de l'API.
 */
let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnv().STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}
