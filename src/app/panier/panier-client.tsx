"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/ui/price";
import { useCartStore, type CartLine } from "@/features/cart";
import type { PricingRole } from "@/lib/pricing/types";
import type { ResolveCartResponse, ResolvedCartLine, ShippingEstimate } from "@/app/api/cart/resolve/route";

interface DisplayLine {
  line: CartLine;
  resolved: ResolvedCartLine | undefined;
}

interface PackGroup {
  packId: string;
  calculatorParams: string;
  lines: DisplayLine[];
}

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="h-9 w-9 px-0"
        aria-label="Diminuer la quantité"
        onClick={() => onChange(quantity - 1)}
      >
        −
      </Button>
      <span className="w-8 text-center font-medium text-ink">{quantity}</span>
      <Button
        variant="secondary"
        size="sm"
        className="h-9 w-9 px-0"
        aria-label="Augmenter la quantité"
        onClick={() => onChange(quantity + 1)}
      >
        +
      </Button>
    </div>
  );
}

function LineRow({
  display,
  role,
  onQuantityChange,
  onRemove,
}: {
  display: DisplayLine;
  role: PricingRole;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { line, resolved } = display;
  // Un pro raisonne en HT (14) : le prix unitaire affiché est le HT, quelle
  // que soit la remise pack — le détail HT/TVA/TTC de la ligne est visible
  // dans le récapitulatif du panier (`lineHtCents`/`lineVatCents`, ci-dessous).
  // Un particulier voit le TTC habituel, remise déjà déduite.
  const unitAmountCents = resolved
    ? role === "b2b"
      ? resolved.unitHtCents
      : Math.round(resolved.lineTtcCents / line.quantity)
    : 0;
  const compareAtUnitAmountCents =
    resolved?.compareAtLineTtcCents && role === "b2c"
      ? Math.round(resolved.compareAtLineTtcCents / line.quantity)
      : undefined;

  return (
    <li className="flex items-center gap-4 py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface">
        {resolved?.image ? (
          <Image src={resolved.image} alt={resolved.name} fill sizes="64px" className="object-cover" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <span className="font-medium text-ink">{resolved?.name ?? line.sku}</span>
        {resolved && !resolved.available ? (
          <Badge variant="out-of-stock" className="w-fit">
            Indisponible — retirez cette ligne
          </Badge>
        ) : resolved ? (
          <Price
            amountCents={unitAmountCents}
            compareAtAmountCents={compareAtUnitAmountCents}
            role={role}
            size="sm"
          />
        ) : (
          <span className="text-sm text-ink-muted">Chargement…</span>
        )}
      </div>

      <QuantityControl quantity={line.quantity} onChange={onQuantityChange} />

      {resolved ? (
        <span className="w-24 shrink-0 text-right font-heading font-semibold text-ink">
          <Price
            amountCents={role === "b2b" ? resolved.lineHtCents : resolved.lineTtcCents}
            compareAtAmountCents={role === "b2c" ? resolved.compareAtLineTtcCents : undefined}
            role={role}
            size="sm"
          />
        </span>
      ) : null}

      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Retirer cette ligne">
        Retirer
      </Button>
    </li>
  );
}

export function PanierClient() {
  const lines = useCartStore((state) => state.lines);
  const packs = useCartStore((state) => state.packs);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const removePack = useCartStore((state) => state.removePack);

  const [resolvedLines, setResolvedLines] = useState<ResolvedCartLine[] | null>(null);
  const [role, setRole] = useState<PricingRole>("b2c");
  const [shipping, setShipping] = useState<ShippingEstimate | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const trimmedPostalCode = postalCode.trim();

  const requestBody = useMemo(
    () =>
      JSON.stringify({
        lines: lines.map(({ sku, quantity, source, packId }) => ({ sku, quantity, source, packId })),
        packs: Object.fromEntries(
          Object.entries(packs).map(([packId, meta]) => [packId, { originalSkus: meta.originalSkus }]),
        ),
        postalCode: trimmedPostalCode || undefined,
      }),
    [lines, packs, trimmedPostalCode],
  );

  useEffect(() => {
    if (lines.length === 0) return;

    let cancelled = false;

    fetch("/api/cart/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    })
      .then((res) => res.json() as Promise<ResolveCartResponse>)
      .then((data) => {
        if (!cancelled) {
          setResolvedLines(data.lines);
          setRole(data.role);
          setShipping(data.shipping);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedLines(null);
          setShipping(null);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestBody]);

  const displayLines: DisplayLine[] = lines.map((line, index) => ({
    line,
    resolved: resolvedLines?.[index],
  }));

  const standaloneLines = displayLines.filter((d) => d.line.source === "catalog");
  const packGroups: PackGroup[] = Object.entries(packs)
    .map(([packId, meta]) => ({
      packId,
      calculatorParams: meta.calculatorParams,
      lines: displayLines.filter((d) => d.line.packId === packId),
    }))
    .filter((group) => group.lines.length > 0);

  // Sommes des lignes déjà résolues par `/api/cart/resolve` — CE que le
  // checkout facturera au centime près (10/13/23), `lineTtcCents` étant
  // calculé par la même fonction (`computeLineCharge`) que `/api/checkout`.
  const itemsHtCents = displayLines.reduce((sum, d) => {
    if (!d.resolved?.available) return sum;
    return sum + d.resolved.lineHtCents;
  }, 0);

  const itemsVatCents = displayLines.reduce((sum, d) => {
    if (!d.resolved?.available) return sum;
    return sum + d.resolved.lineVatCents;
  }, 0);

  const itemsTtcCents = displayLines.reduce((sum, d) => {
    if (!d.resolved?.available) return sum;
    return sum + d.resolved.lineTtcCents;
  }, 0);

  const packDiscountCents = displayLines.reduce((sum, d) => {
    if (!d.resolved?.available || !d.resolved.compareAtLineTtcCents) return sum;
    return sum + (d.resolved.compareAtLineTtcCents - d.resolved.lineTtcCents);
  }, 0);

  const isEmpty = lines.length === 0;
  const isLoadingPrices = !isEmpty && resolvedLines === null;
  const hasUnavailableLines = displayLines.some((d) => d.resolved && !d.resolved.available);

  async function handlePayer() {
    setCheckoutError(null);
    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!res.ok) {
        setCheckoutError(
          "Impossible de démarrer le paiement. Vérifiez votre panier et réessayez.",
        );
        return;
      }

      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      setCheckoutError("Impossible de démarrer le paiement. Réessayez dans un instant.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">Panier</h1>

      {isEmpty ? (
        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="max-w-sm text-ink-muted">Votre panier est vide pour le moment.</p>
          <Link href="/membrane-armee">
            <Button variant="primary">Voir les membranes</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          {packGroups.map((group) => {
            const groupDiscountBps = group.lines[0]?.resolved?.discountBps ?? 0;
            const groupResolved = group.lines.every((d) => d.resolved);

            return (
            <div key={group.packId} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <div className="flex items-center gap-3">
                  <Badge variant="promo">
                    {groupDiscountBps > 0 ? `Pack -${groupDiscountBps / 100} %` : "Pack"}
                  </Badge>
                  <Link
                    href={`/calculateur?${group.calculatorParams}`}
                    className="text-sm font-medium text-accent underline"
                  >
                    Recalculer
                  </Link>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removePack(group.packId)}>
                  Retirer le pack
                </Button>
              </div>

              {groupResolved && groupDiscountBps === 0 ? (
                <p className="pb-2 text-xs text-ink-muted">
                  Remise pack retirée : un article du pack a été retiré du panier.
                </p>
              ) : null}

              <ul className="flex flex-col divide-y divide-border">
                {group.lines.map((display) => (
                  <LineRow
                    key={`${display.line.sku}-${group.packId}`}
                    display={display}
                    role={role}
                    onQuantityChange={(quantity) =>
                      updateQuantity(display.line.sku, group.packId, quantity)
                    }
                    onRemove={() => removeLine(display.line.sku, group.packId)}
                  />
                ))}
              </ul>
            </div>
            );
          })}

          {standaloneLines.length > 0 ? (
            <div className="rounded-lg border border-border p-4">
              <ul className="flex flex-col divide-y divide-border">
                {standaloneLines.map((display) => (
                  <LineRow
                    key={display.line.sku}
                    display={display}
                    role={role}
                    onQuantityChange={(quantity) =>
                      updateQuantity(display.line.sku, undefined, quantity)
                    }
                    onRemove={() => removeLine(display.line.sku, undefined)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-border pt-6">
            {!isLoadingPrices && packDiscountCents > 0 ? (
              <div className="flex items-center justify-between text-sm text-accent">
                <span>Remise pack</span>
                <div className="flex items-center gap-1">
                  <span>-</span>
                  <Price amountCents={packDiscountCents} size="sm" />
                </div>
              </div>
            ) : null}

            {!isLoadingPrices && role === "b2b" ? (
              // Ventilation HT/TVA/TTC explicite pour un pro (14) : le HT est
              // le prix qui lui parle, mais le TTC ci-dessous est — au
              // centime près — ce que Stripe débitera (même calcul que
              // `/api/checkout`, `computeLineCharge`).
              <>
                <div className="flex items-center justify-between text-sm text-ink-muted">
                  <span>Total HT (articles)</span>
                  <Price amountCents={itemsHtCents} role="b2b" size="sm" />
                </div>
                <div className="flex items-center justify-between text-sm text-ink-muted">
                  <span>TVA (20 %)</span>
                  <Price amountCents={itemsVatCents} size="sm" />
                </div>
              </>
            ) : null}

            <div className="flex items-center justify-between">
              <span className="font-heading text-lg font-semibold text-ink">
                {role === "b2b" ? "Total TTC (articles)" : "Sous-total"}
              </span>
              {isLoadingPrices ? (
                <span className="text-ink-muted">Calcul…</span>
              ) : (
                <Price amountCents={itemsTtcCents} size="lg" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <Input
              label="Code postal de livraison (optionnel)"
              hint="Pour estimer le port exact (surcoût Corse le cas échéant) avant paiement."
              inputMode="numeric"
              maxLength={5}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="ex. 33000"
            />

            {shipping?.zoneExcluded ? (
              <p className="text-sm text-danger">
                Nous ne livrons pas les DOM-TOM en V1 : seule la France métropolitaine (Corse
                incluse) est couverte.
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">
                  {shipping ? shipping.delayLabel : "Frais de port calculés à l'étape de paiement (12)."}
                  {shipping?.corsicaSurchargeApplied ? " — surcoût Corse inclus" : ""}
                </span>
                {shipping ? (
                  shipping.amountCents > 0 ? (
                    <Price amountCents={shipping.amountCents} size="sm" />
                  ) : (
                    <Badge variant="promo">Livraison offerte</Badge>
                  )
                ) : null}
              </div>
            )}
          </div>

          {!isLoadingPrices && shipping && !shipping.zoneExcluded ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-heading text-xl font-semibold text-ink">
                Total à payer{role === "b2b" ? " (TTC)" : ""}
              </span>
              <Price amountCents={itemsTtcCents + shipping.amountCents} size="lg" />
            </div>
          ) : null}

          {hasUnavailableLines ? (
            <p className="text-sm text-danger">
              Retirez les articles indisponibles avant de continuer.
            </p>
          ) : null}

          {checkoutError ? <p className="text-sm text-danger">{checkoutError}</p> : null}

          <Button
            variant="primary"
            size="lg"
            disabled={
              isLoadingPrices || hasUnavailableLines || isCheckingOut || Boolean(shipping?.zoneExcluded)
            }
            onClick={handlePayer}
          >
            {isCheckingOut ? "Redirection vers le paiement…" : "Payer"}
          </Button>
        </div>
      )}
    </div>
  );
}
