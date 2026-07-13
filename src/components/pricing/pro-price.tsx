"use client";

import { useEffect, useState } from "react";

import { Price, type PriceSize } from "@/components/ui/price";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type ProductPriceResponse =
  | { role: "b2c"; publicTtcCents: number }
  | { role: "b2b"; publicTtcCents: number; proUnitAmountCents: number };

export interface ProPriceProps {
  slug: string;
  /** Prix public TTC déjà présent dans le HTML statique (07) — jamais retiré, seulement remplacé si b2b. */
  publicAmountCents: number;
  size?: PriceSize;
  className?: string;
}

/**
 * Affiche le prix public par défaut (identique au HTML statique servi par la
 * page ISR, 07) puis, UNIQUEMENT si un utilisateur est connecté, interroge
 * `/api/pricing/product-price` pour savoir si son rôle réel est "b2b" et
 * remplace l'affichage par le prix HT remisé le cas échéant. Le prix pro
 * n'existe donc jamais dans le HTML mis en cache — seulement après montage,
 * côté client (14). `slug` (jamais `sku`, préfixé `APF-...`) est le seul
 * identifiant transmis (23, decisions.md).
 */
export function ProPrice({ slug, publicAmountCents, size, className }: ProPriceProps) {
  const user = useAuthUser();
  const [proPrice, setProPrice] = useState<Extract<ProductPriceResponse, { role: "b2b" }>>();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    fetch(`/api/pricing/product-price?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductPriceResponse>) : null))
      .then((data) => {
        if (!cancelled && data?.role === "b2b") setProPrice(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [slug, user]);

  if (proPrice) {
    return (
      <Price
        amountCents={proPrice.proUnitAmountCents}
        role="b2b"
        size={size}
        className={className}
      />
    );
  }

  return <Price amountCents={publicAmountCents} role="b2c" size={size} className={className} />;
}
