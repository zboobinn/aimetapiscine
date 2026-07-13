import type { ReactNode } from "react";

export interface StickyBuyBoxProps {
  children: ReactNode;
  className?: string;
}

/** `position: sticky; top: var(--header-h)`. Zéro JS. */
export function StickyBuyBox({ children, className }: StickyBuyBoxProps) {
  return (
    <div
      className={className}
      style={{
        position: "sticky",
        top: "var(--header-h)",
        background: "var(--surface)",
        border: "1px solid var(--coping)",
        borderRadius: "var(--radius)",
        padding: "1.5rem",
      }}
    >
      {children}
    </div>
  );
}
