import "server-only";

import { getCompanyEnv } from "@/lib/env";

/**
 * Identité société lue depuis l'env (26) : seule source affichée sur les
 * documents de commande (BL, facture) — jamais de mention APF (01/11).
 */
export function getCompanyInfo() {
  const env = getCompanyEnv();
  return {
    name: env.COMPANY_NAME,
    siren: env.COMPANY_SIREN,
    vat: env.COMPANY_VAT,
    address: env.COMPANY_ADDRESS,
  };
}
