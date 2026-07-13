"use client";

import { forwardRef } from "react";

export interface SwatchProps {
  /** Nom du coloris — porté par le texte, pas seulement par la couleur (a11y daltonisme). */
  name: string;
  /** Couleur de la pastille. */
  color: string;
  selected: boolean;
  onSelect: () => void;
  tabIndex?: number;
}

export const Swatch = forwardRef<HTMLButtonElement, SwatchProps>(function Swatch(
  { name, color, selected, onSelect, tabIndex },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      className="flex flex-col items-center gap-2 border p-3 text-left"
      style={{
        borderColor: selected ? "var(--ink)" : "var(--coping)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
      }}
    >
      <span
        aria-hidden="true"
        className="block h-10 w-10 border"
        style={{
          background: color,
          borderColor: "var(--coping)",
          borderRadius: "var(--radius)",
        }}
      />
      <span className="text-[var(--step--1)]" style={{ color: "var(--ink)" }}>
        {name}
      </span>
    </button>
  );
});
