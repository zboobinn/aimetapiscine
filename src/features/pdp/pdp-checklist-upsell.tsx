"use client";

import { isChecklistPackFormed } from "./checklist-pack-pricing";
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
 * compte à rebours).
 */
export function PdpChecklistUpsell() {
  const { checklistAccessories, checkedAccessorySlugs, toggleAccessory, packAmounts, packDiscountBps } =
    usePdpContext();

  if (checklistAccessories.length === 0) return null;

  const packFormed = isChecklistPackFormed(checkedAccessorySlugs);

  return (
    <section className="mx-auto flex w-full flex-col gap-6" style={{ maxWidth: "var(--page-max)" }}>
      <h2 className="font-display" style={{ fontSize: "var(--step-1)" }}>
        Pour poser ce liner, il vous faudra aussi
      </h2>

      <ul className="flex flex-col divide-y" style={{ borderColor: "var(--coping)" }}>
        {checklistAccessories.map((accessory) => {
          const checked = checkedAccessorySlugs.includes(accessory.slug);
          const charge = packAmounts.accessoryCharges[accessory.slug];

          return (
            <li key={accessory.slug} className="flex items-center justify-between gap-4 py-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={checked} onChange={() => toggleAccessory(accessory.slug)} />
                <span>
                  {accessory.name} — {accessory.quantity} {accessory.unit}{" "}
                  <span style={{ color: "var(--ink-60)" }}>(non inclus)</span>
                </span>
              </label>
              {charge ? (
                <span className="font-mono tabular-nums">{formatCents(charge.lineTtcCents)}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {packFormed ? (
        <p style={{ color: "var(--ink-60)" }}>
          Remise pack -{(packDiscountBps / 100).toLocaleString("fr-FR")} % appliquée : la membrane et les
          accessoires cochés sont facturés remisés, exactement comme dans votre panier.
        </p>
      ) : null}
    </section>
  );
}
