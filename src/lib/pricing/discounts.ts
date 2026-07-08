/**
 * Moteur de remises Niveau 1 (13) : calcul centralisé, configurable sans
 * code (taux via env, 26), pour que le futur moteur Niveau 2 (codes promo,
 * dates de validité, conditions de montant, cumul de plusieurs remises) se
 * greffe ici sans disperser la logique dans checkout / cart-resolve / webhook.
 * Le vecteur de persistance reste `order_items.discount_bps` (03).
 *
 * Fonction pure, sans dépendance serveur : utilisable aussi bien côté client
 * (aperçu immédiat du badge « Pack -5 % » depuis le store panier) que côté
 * serveur (calcul autoritaire au checkout, 23). Le serveur reste seul juge du
 * montant facturé — ce module ne fait que déterminer QUELLES lignes sont
 * éligibles, jamais leur prix.
 */

export interface DiscountableCartLine {
  sku: string;
  quantity: number;
  source: "catalog" | "pack";
  packId?: string;
}

export interface PackManifest {
  /**
   * SKUs uniques composant le pack au moment de son ajout au panier (08).
   * Sert à détecter qu'un article a été retiré depuis : la remise pack
   * disparaît alors (13). Au moins 2 SKUs attendus (membrane + accessoires) —
   * un manifeste plus court n'est jamais considéré comme un pack valide.
   */
  originalSkus: string[];
}

function isPackComplete(
  packId: string,
  manifest: PackManifest | undefined,
  lines: DiscountableCartLine[],
): boolean {
  if (!manifest || manifest.originalSkus.length < 2) return false;

  const currentSkus = new Set(
    lines.filter((line) => line.source === "pack" && line.packId === packId).map((line) => line.sku),
  );

  return manifest.originalSkus.every((sku) => currentSkus.has(sku));
}

/**
 * Retourne, pour chaque ligne (même ordre que `lines`), le `discount_bps` à
 * appliquer : `discountBpsRate` si la ligne vient d'un pack calculateur
 * (`source: "pack"`) encore complet au panier, 0 sinon.
 */
export function computeLineDiscountsBps(
  lines: DiscountableCartLine[],
  manifests: Record<string, PackManifest>,
  discountBpsRate: number,
): number[] {
  const completenessCache = new Map<string, boolean>();

  return lines.map((line) => {
    if (line.source !== "pack" || !line.packId) return 0;

    let complete = completenessCache.get(line.packId);
    if (complete === undefined) {
      complete = isPackComplete(line.packId, manifests[line.packId], lines);
      completenessCache.set(line.packId, complete);
    }

    return complete ? discountBpsRate : 0;
  });
}
