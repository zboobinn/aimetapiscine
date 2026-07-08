"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { useCartStore } from "@/features/cart";
import type { CatalogEntry } from "@/lib/catalog/schema";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils/cn";

export interface AddToCartButtonProps {
  product: CatalogEntry;
  /** Accessoires compatibles (09) — uniquement fourni depuis les fiches membrane ; simple suggestion, jamais un ajout forcé. */
  compatibleAccessories?: CatalogEntry[];
  size?: "md" | "lg";
  className?: string;
}

export function AddToCartButton({
  product,
  compatibleAccessories = [],
  size = "lg",
  className,
}: AddToCartButtonProps) {
  const addCatalogLine = useCartStore((state) => state.addCatalogLine);
  const [added, setAdded] = useState(false);
  const [addedAccessorySkus, setAddedAccessorySkus] = useState<string[]>([]);

  function handleAdd() {
    addCatalogLine(product.sku);
    setAdded(true);
  }

  function handleAddAccessory(sku: string) {
    addCatalogLine(sku);
    setAddedAccessorySkus((prev) => [...prev, sku]);
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
          disabled={!product.in_stock}
        >
          {added ? "Ajouté ✓" : product.in_stock ? "Ajouter au panier" : "Indisponible"}
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
              const isAdded = addedAccessorySkus.includes(accessory.sku);
              return (
                <li key={accessory.sku} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{accessory.name}</span>
                    <Price
                      amountCents={computePublicTtcCents(accessory.base_price_ht, accessory.vat_rate)}
                      role="b2c"
                      size="sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddAccessory(accessory.sku)}
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
