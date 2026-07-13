import type { ReactNode } from "react";

export interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  /** `<details name="pdp">` : accordéon exclusif — un seul panneau ouvert à la fois. */
  name?: string;
  defaultOpen?: boolean;
}

/**
 * `<details>` natif — jamais d'onglets horizontaux (28). Le contenu est
 * présent dans le DOM au rendu (indexable), pas un rendu conditionnel JS.
 */
export function CollapsibleSection({ title, children, name, defaultOpen }: CollapsibleSectionProps) {
  return (
    <details
      name={name}
      open={defaultOpen}
      className="border-t"
      style={{ borderColor: "var(--coping)" }}
    >
      <summary
        className="cursor-pointer list-none py-4 font-display"
        style={{ fontSize: "var(--step-1)", color: "var(--ink)" }}
      >
        {title}
      </summary>
      <div className="pb-4" style={{ color: "var(--ink)", lineHeight: "var(--lh-body)" }}>
        {children}
      </div>
    </details>
  );
}
