import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ProductCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  price: ReactNode;
  href?: string;
  className?: string;
}

export function ProductCard({
  imageSrc,
  imageAlt,
  title,
  subtitle,
  badge,
  price,
  href,
  className,
}: ProductCardProps) {
  const content = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover"
        />
        {badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
      </div>
      <div className="flex flex-col gap-1 pt-4">
        <h3 className="font-heading text-base font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
        <div className="pt-1">{price}</div>
      </div>
    </>
  );

  const wrapperClass = cn(
    "group block rounded-lg p-3 transition-shadow hover:shadow-soft",
    className,
  );

  if (href) {
    return (
      <a href={href} className={wrapperClass}>
        {content}
      </a>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
