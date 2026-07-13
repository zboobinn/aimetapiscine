import type { CatalogEntry } from "@/lib/catalog/schema";
import { resolvePriceBreakdown } from "@/lib/pricing/resolve-price";
import type { PricingRole } from "@/lib/pricing/types";
import { derivePriceBlockAmounts } from "./derive-price-block-amounts";

export interface PriceBlockProps {
  product: CatalogEntry;
  quantity?: number;
  /** Par défaut b2c — le prix pro ne doit jamais apparaître sur une page publique non authentifiée (28). */
  role?: PricingRole;
}

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Consomme EXCLUSIVEMENT `resolvePriceBreakdown`/`computeLineChargeFromUnitHt`
 * (`src/lib/pricing/`, mêmes fonctions que panier/checkout/facture) — aucun
 * recalcul local, aucune constante de prix/TVA réécrite ici
 * (docs/decisions.md, D6). Le prix unitaire affiché reste
 * `resolvePriceBreakdown().unitAmountCents` (TTC unitaire) ; le total de
 * ligne et le €/m² passent par `computeLineChargeFromUnitHt` via
 * `derivePriceBlockAmounts` (`./derive-price-block-amounts.ts`), jamais par
 * `unitAmountCents × quantity`.
 */
export async function PriceBlock({ product, quantity = 1, role = "b2c" }: PriceBlockProps) {
  const { unitAmountCents, unitHtCents } = await resolvePriceBreakdown(product, role);
  const suffix = role === "b2b" ? "HT" : "TTC";
  const { lineTtcCents: totalCents, pricePerM2Cents } = derivePriceBlockAmounts(
    unitHtCents,
    quantity,
    product.vat_rate,
    product.roll_area_m2,
  );

  return (
    <dl className="flex flex-col gap-3" style={{ color: "var(--ink)" }}>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
          Prix {suffix}
        </dt>
        <dd
          className="font-mono tabular-nums"
          style={{ fontSize: "var(--step-2)" }}
        >
          {formatCents(unitAmountCents)}
        </dd>
      </div>

      {pricePerM2Cents !== null ? (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Prix au m²
          </dt>
          <dd
            className="font-mono tabular-nums text-[var(--step--1)]"
            style={{ color: "var(--ink-60)" }}
          >
            {formatCents(pricePerM2Cents)} / m²
          </dd>
        </div>
      ) : null}

      <div
        className="flex items-baseline justify-between gap-4 border-t pt-3"
        style={{ borderColor: "var(--coping)" }}
      >
        <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
          Total estimé ({quantity} unité{quantity > 1 ? "s" : ""})
        </dt>
        <dd className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
          {formatCents(totalCents)}
        </dd>
      </div>
    </dl>
  );
}
