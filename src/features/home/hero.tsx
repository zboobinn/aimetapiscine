"use client";

import { useState } from "react";
import Link from "next/link";
import { PoolImage } from "@/components/media/pool-image";
import { Bleed } from "@/components/nuancier/bleed";
import { SwatchGroup } from "@/components/nuancier/swatch-group";
import type { HeroSwatchOption } from "./hero-swatch-options";

export interface HeroProps {
  swatchOptions: HeroSwatchOption[];
}

/**
 * Hero (30 §01) — spécification serrée (D4, docs/decisions.md) : AUCUNE
 * animation d'entrée. Une image, des pastilles, deux CTA. Le seul mouvement
 * est le crossfade ≤120ms de la photo au clic swatch (`.swatch-crossfade`,
 * CSS pur, `globals.css`) — son repli `prefers-reduced-motion: reduce` est
 * déjà couvert par la règle globale (`transition-duration: 0.01ms`).
 *
 * `SwatchGroup` est utilisé en mode contrôlé (30, swatch contrôlable) avec
 * `showPreviewImage={false}` : l'unique photo à l'écran est la pile
 * ci-dessous (plein cadre, `PoolImage`, élément LCP), jamais l'aperçu interne
 * du composant — pas de doublon.
 */
export function Hero({ swatchOptions }: HeroProps) {
  const [selectedId, setSelectedId] = useState(swatchOptions[0]?.id);
  const selectedOption = swatchOptions.find((option) => option.id === selectedId) ?? null;

  return (
    <section>
      <Bleed>
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          {swatchOptions.map((option, index) => (
            <PoolImage
              key={option.id}
              colorisSlug={option.id}
              plan="bassin"
              // Précharge les 2 premiers coloris seulement (30 §01) — jamais les six.
              priority={index < 2}
              fetchPriority={index === 0 ? "high" : undefined}
              ariaHidden={option.id !== selectedId}
              className={`swatch-crossfade absolute inset-0 h-full w-full object-cover ${
                option.id === selectedId ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </Bleed>

      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-10 sm:px-6" style={{ maxWidth: "var(--page-max)" }}>
        <div className="flex flex-col gap-3">
          <p className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Membrane armée sur mesure
          </p>
          <h1 className="font-display" style={{ fontSize: "var(--step-3)", lineHeight: "var(--lh-tight)" }}>
            Votre bassin, sans mauvaise surprise de cote
          </h1>
          <p style={{ color: "var(--ink)", lineHeight: "var(--lh-body)", maxWidth: "var(--measure)" }}>
            Calculez votre besoin en rouleaux et repartez avec un pack prêt à poser — membrane et
            accessoires inclus. (copie provisoire — OK)
          </p>
        </div>

        {swatchOptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SwatchGroup
              label="Coloris de la membrane"
              options={swatchOptions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showPreviewImage={false}
            />
            {selectedOption ? (
              <p className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {selectedOption.waterAppearance}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/calculateur"
            className="border px-5 py-3 text-center font-medium"
            style={{
              borderColor: "var(--ink)",
              borderRadius: "var(--radius)",
              color: "var(--surface)",
              background: "var(--ink)",
            }}
          >
            Calculer ma membrane
          </Link>
          <Link
            href="/membrane-armee"
            className="border px-5 py-3 text-center font-medium"
            style={{ borderColor: "var(--ink)", borderRadius: "var(--radius)", color: "var(--ink)" }}
          >
            Voir les coloris
          </Link>
        </div>
      </div>
    </section>
  );
}
