import type { ReactNode } from "react";

export interface BleedProps {
  children: ReactNode;
  className?: string;
}

/** Utilitaire full-bleed : casse le conteneur centré `--page-max`. */
export function Bleed({ children, className }: BleedProps) {
  return <div className={className ? `bleed ${className}` : "bleed"}>{children}</div>;
}
