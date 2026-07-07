import { cn } from "@/lib/utils/cn";

export type PriceRole = "b2c" | "b2b";
export type PriceSize = "sm" | "md" | "lg";

export interface PriceProps {
  /** Montant en centimes : TTC si role="b2c", HT si role="b2b". */
  amountCents: number;
  /** Prix barré en centimes (ex. avant remise pack -5 %, spec 13). */
  compareAtAmountCents?: number;
  /**
   * Rôle de tarification. La résolution automatique depuis l'utilisateur
   * connecté sera branchée ultérieurement (specs 13/14) ; en attendant, ce
   * composant se contente d'afficher ce qu'on lui passe.
   */
  role?: PriceRole;
  size?: PriceSize;
  className?: string;
}

const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

const sizeClasses: Record<PriceSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

const compareSizeClasses: Record<PriceSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Price({
  amountCents,
  compareAtAmountCents,
  role = "b2c",
  size = "md",
  className,
}: PriceProps) {
  const suffix = role === "b2b" ? "HT" : "TTC";
  const hasDiscount =
    typeof compareAtAmountCents === "number" && compareAtAmountCents > amountCents;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-heading font-semibold text-ink", sizeClasses[size])}>
        {formatCents(amountCents)}
      </span>
      <span className="text-sm font-medium text-ink-muted">{suffix}</span>
      {hasDiscount ? (
        <span
          className={cn(
            "text-ink-muted line-through decoration-1",
            compareSizeClasses[size],
          )}
        >
          {formatCents(compareAtAmountCents as number)}
        </span>
      ) : null}
    </div>
  );
}
