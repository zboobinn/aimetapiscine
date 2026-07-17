import Image from "next/image";

import { resolvePoolMedia, type PoolMediaPlan } from "@/lib/media/pool-media";

export interface PoolImageProps {
  colorisSlug: string;
  plan: PoolMediaPlan;
  /** Réservé à l'image LCP de la page (29/30) — jamais plus d'une par route. */
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  /** Pile crossfade (30) : masque les photos inactives aux lecteurs d'écran. */
  ariaHidden?: boolean;
}

/**
 * Enveloppe `next/image` unique pour les photos produit par coloris. Résout
 * via `resolvePoolMedia()` — aucun composant n'a le droit de connaître un
 * chemin d'image directement. `width`/`height` viennent du manifeste (CLS =
 * 0, brief annexe-photo). Pas de `.withMetadata()` (27) : cohérent avec le
 * reste du pipeline média du projet.
 */
export function PoolImage({ colorisSlug, plan, priority, fetchPriority, className, ariaHidden }: PoolImageProps) {
  const entry = resolvePoolMedia(colorisSlug);
  const image = entry.plans[plan];

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      priority={priority}
      fetchPriority={fetchPriority}
      className={className}
      aria-hidden={ariaHidden}
    />
  );
}
