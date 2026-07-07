import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "in-stock" | "out-of-stock" | "promo" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  "in-stock": "bg-success-surface text-success",
  "out-of-stock": "bg-danger-surface text-danger",
  promo: "bg-accent-surface text-accent",
  neutral: "bg-surface text-ink-muted",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
