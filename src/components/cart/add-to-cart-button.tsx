"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { useCartStore } from "@/features/cart";
import type { CartProductSummary } from "@/lib/cart/product-summary";
import { cn } from "@/lib/utils/cn";

export type { CartProductSummary };

export interface AddToCartButtonProps {
  product: CartProductSummary;
  /** Accessoires compatibles (09) — uniquement fourni depuis les fiches membrane ; simple suggestion, jamais un ajout forcé. */
  compatibleAccessories?: CartProductSummary[];
  /** Quantité ajoutée au panier (29) — ex. le nombre de rouleaux calculé sur les cotes par défaut. Défaut 1 (comportement historique). */
  quantity?: number;
  size?: "md" | "lg";
  className?: string;
}

export function AddToCartButton({
  product,
  compatibleAccessories = [],
  quantity = 1,
  size = "lg",
  className,
}: AddToCartButtonProps) {
  const addCatalogLine = useCartStore((state) => state.addCatalogLine);
  const [added, setAdded] = useState(false);
  const [addedAccessorySlugs, setAddedAccessorySlugs] = useState<string[]>([]);

  function handleAdd() {
    addCatalogLine(product.slug, quantity);
    setAdded(true);
  }

  function handleAddAccessory(slug: string) {
    addCatalogLine(slug);
    setAddedAccessorySlugs((prev) => [...prev, slug]);
  }

  const showCrossSell = added && compatibleAccessories.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
        <Button
          variant="primary"
          size={size}
          className="w-full sm:w-auto"
          onClick={handleAdd}
          disabled={!product.inStock}
        >
          {added ? "Ajouté ✓" : product.inStock ? "Ajouter au panier" : "Indisponible"}
        </Button>
        {added ? (
          <Link
            href="/panier"
            className="flex min-h-11 items-center justify-center font-medium text-accent underline sm:justify-start"
          >
            Voir le panier
          </Link>
        ) : null}
      </div>

      {showCrossSell ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-ink">
            Vous aurez probablement besoin de ces accessoires de pose :
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {compatibleAccessories.map((accessory) => {
              const isAdded = addedAccessorySlugs.includes(accessory.slug);
              return (
                <li key={accessory.slug} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{accessory.name}</span>
                    <Price amountCents={accessory.publicTtcCents} role="b2c" size="sm" />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddAccessory(accessory.slug)}
                    disabled={isAdded}
                  >
                    {isAdded ? "Ajouté ✓" : "Ajouter"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
