"use client";

import { useState } from "react";
import Link from "next/link";
import { PoolImage } from "@/components/media/pool-image";
import { WaterDropIcon } from "./home-icons";
import { HOME_RADIUS, HOME_SHADOW } from "./home-look";

export interface NuancierCardProps {
  href: string;
  couleurSlug: string;
  name: string;
  gammeLabel: string;
  waterAppearance: string;
  animationDelayMs: number;
}

/**
 * Carte nuancier (30 §04) — macro au repos → bassin rempli. Le crossfade
 * CSS pur (`.swatch-crossfade`, `group-hover`/`group-focus`) couvre déjà
 * souris et clavier (focus du lien). Le bouton ci-dessous ajoute la bascule
 * TACTILE (pas de `:hover` sur mobile) : un `<button>` séparé, superposé à
 * l'image (z-index, hors du `<Link>` pour ne pas imbriquer un bouton dans un
 * lien), qui bascule un état React indépendant du survol.
 */
export function NuancierCard({
  href,
  couleurSlug,
  name,
  gammeLabel,
  waterAppearance,
  animationDelayMs,
}: NuancierCardProps) {
  const [filled, setFilled] = useState(false);

  return (
    <div
      className="reveal group relative flex flex-col overflow-hidden border"
      style={{
        borderColor: "var(--coping)",
        borderRadius: HOME_RADIUS,
        boxShadow: HOME_SHADOW,
        background: "var(--surface)",
        animationDelay: `${animationDelayMs}ms`,
      }}
    >
      <Link href={href} className="block">
        <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
          <PoolImage colorisSlug={couleurSlug} plan="macro" className="h-full w-full object-cover" />
          <PoolImage
            colorisSlug={couleurSlug}
            plan="bassin"
            ariaHidden
            className={`swatch-crossfade absolute inset-0 h-full w-full object-cover group-hover:opacity-100 group-focus:opacity-100 ${
              filled ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <span style={{ color: "var(--ink)" }}>{name}</span>
          <span className="font-mono" style={{ fontSize: "var(--step--1)", color: "var(--ink-60)" }}>
            {gammeLabel}
          </span>
        </div>
        <p className="px-4 pb-4 pt-1 text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
          {waterAppearance}
        </p>
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setFilled((prev) => !prev);
        }}
        aria-pressed={filled}
        aria-label={
          filled
            ? `Masquer l'aperçu bassin rempli — ${name}`
            : `Aperçu bassin rempli — ${name}`
        }
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.9)", color: "var(--deep-blue)" }}
      >
        <WaterDropIcon />
      </button>
    </div>
  );
}
