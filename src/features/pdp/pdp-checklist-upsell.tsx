"use client";

import { usePdpContext } from "./pdp-context";

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Checklist de chantier (29 §9, 29c②) — en bas de page, JAMAIS dans la
 * buy-box. Rendue directement à sa place dans l'arbre React (Correctif
 * hydratation 29c②, plus de `createPortal`) : `[couleur]/page.tsx` la place
 * en JSX après la fiche technique/FAQ, à l'intérieur du même `PdpProvider`
 * que `PdpBuyBox` — un seul état (`usePdpContext()`), donc SSR et
 * hydratation produisent EXACTEMENT le même arbre, sans mismatch.
 *
 * Chaque item porte explicitement « non inclus » ; la remise est le SEUL
 * argument affiché une fois le pack formé (pas de badge d'urgence, pas de
 * compte à rebours). `isPackFormed` (29c② partie B, décision métier) vient
 * du contexte — TOUS les accessoires doivent être cochés, un seul ne suffit
 * plus : jamais recalculé localement, même fonction que la buy-box
 * (`isChecklistPackFormed`, lue une seule fois dans `PdpProvider`).
 */
export function PdpChecklistUpsell() {
  const {
    checklistAccessories,
    checkedAccessorySlugs,
    toggleAccessory,
    packAmounts,
    packDiscountBps,
    accessoryQuantities,
    setAccessoryQuantity,
    isPackFormed,
  } = usePdpContext();

  if (checklistAccessories.length === 0) return null;

  const someChecked = checkedAccessorySlugs.length > 0;

  return (
    <section className="mx-auto flex w-full flex-col gap-6" style={{ maxWidth: "var(--page-max)" }}>
      <h2 className="font-display" style={{ fontSize: "var(--step-1)" }}>
        Pour poser ce liner, il vous faudra aussi
      </h2>

      <ul className="flex flex-col divide-y" style={{ borderColor: "var(--coping)" }}>
        {checklistAccessories.map((accessory) => {
          const checked = checkedAccessorySlugs.includes(accessory.slug);
          const charge = packAmounts.accessoryCharges[accessory.slug];
          const quantity = accessoryQuantities[accessory.slug] ?? accessory.quantity;

          return (
            <li key={accessory.slug} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={checked} onChange={() => toggleAccessory(accessory.slug)} />
                <span>
                  {accessory.name} <span style={{ color: "var(--ink-60)" }}>({accessory.unit})</span>{" "}
                  <span style={{ color: "var(--ink-60)" }}>(non inclus)</span>
                </span>
              </label>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Diminuer la quantité de ${accessory.name}`}
                    onClick={() => setAccessoryQuantity(accessory.slug, quantity - 1)}
                    disabled={quantity <= 1}
                    className="border px-2 py-0.5"
                    style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", color: "var(--ink)" }}
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-mono tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label={`Augmenter la quantité de ${accessory.name}`}
                    onClick={() => setAccessoryQuantity(accessory.slug, quantity + 1)}
                    className="border px-2 py-0.5"
                    style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", color: "var(--ink)" }}
                  >
                    +
                  </button>
                </div>
                {charge ? (
                  <span className="font-mono tabular-nums">{formatCents(charge.lineTtcCents)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {isPackFormed ? (
        <p style={{ color: "var(--ink-60)" }}>
          Remise pack -{(packDiscountBps / 100).toLocaleString("fr-FR")} % appliquée : la membrane et tous
          les accessoires du kit sont facturés remisés, exactement comme dans votre panier.
        </p>
      ) : someChecked ? (
        <p style={{ color: "var(--ink-60)" }}>
          Cochez l&apos;ensemble des articles du kit pour bénéficier de la remise pack.
        </p>
      ) : null}
    </section>
  );
}
