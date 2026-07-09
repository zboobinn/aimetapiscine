import { getSiteEnv } from "@/lib/env";

/** Brand affichée au client — jamais le nom de la société légale (COMPANY_NAME, 11/22) ni le fournisseur (01). */
export const SITE_BRAND = "Membranes Armées";

/** URL absolue construite depuis NEXT_PUBLIC_SITE_URL — jamais l'URL courante (canonical stable, 18). */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteEnv().NEXT_PUBLIC_SITE_URL).toString();
}
