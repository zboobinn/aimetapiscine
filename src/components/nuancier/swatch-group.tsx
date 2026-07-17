"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Swatch } from "./swatch";
import {
  computeNextSwatchIndex,
  isSwatchGroupControlled,
  resolveActiveSelectedId,
  resolveInitialSelectedId,
} from "./swatch-selection";

export interface SwatchGroupOption {
  id: string;
  /** Nom du coloris (a11y daltonisme). */
  name: string;
  color: string;
  image: { src: string; alt: string };
}

export interface SwatchGroupProps {
  /** Libellé accessible du groupe (ex. "Coloris de la membrane"). */
  label: string;
  options: SwatchGroupOption[];
  defaultSelectedId?: string;
  /**
   * Mode contrôlé (30) : sélection pilotée par le parent — fournir avec
   * `onSelect`. `defaultSelectedId`/l'état interne restent utilisés tant que
   * `selectedId` n'est pas fourni (patron React standard).
   */
  selectedId?: string;
  onSelect?: (id: string) => void;
  /**
   * Aperçu photo interne (28b), activé par défaut (comportement PDP
   * inchangé). Le hero (30) affiche déjà sa propre photo plein cadre pilotée
   * par `onSelect` : mettre à `false` pour ne jamais dupliquer la photo à
   * l'écran.
   */
  showPreviewImage?: boolean;
}

/**
 * Le geste signature du site (28) : clic sur une pastille → crossfade ≤120ms
 * de la photo associée. Précharge uniquement les 2 premières images.
 */
export function SwatchGroup({
  label,
  options,
  defaultSelectedId,
  selectedId: selectedIdProp,
  onSelect,
  showPreviewImage = true,
}: SwatchGroupProps) {
  const [internalSelectedId, setInternalSelectedId] = useState(() =>
    resolveInitialSelectedId(options, defaultSelectedId),
  );
  const controlled = isSwatchGroupControlled(selectedIdProp);
  const selectedId = resolveActiveSelectedId(selectedIdProp, internalSelectedId);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.id === selectedId);

  function selectId(id: string) {
    if (!controlled) setInternalSelectedId(id);
    onSelect?.(id);
  }

  function selectIndex(delta: 1 | -1) {
    const nextIndex = computeNextSwatchIndex(selectedIndex, delta, options.length);
    selectId(options[nextIndex].id);
    buttonRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectIndex(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectIndex(-1);
    }
  }

  const preloadOptions = options.slice(0, 2);

  return (
    <div className="flex flex-col gap-4">
      {showPreviewImage
        ? preloadOptions.map((option) => (
            <link key={option.id} rel="preload" as="image" href={option.image.src} />
          ))
        : null}

      {showPreviewImage ? (
        <div
          className="relative w-full overflow-hidden border"
          style={{
            aspectRatio: "4 / 3",
            borderColor: "var(--coping)",
            borderRadius: "var(--radius)",
            background: "var(--lime-wash)",
          }}
        >
          {options.map((option, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- preload manuel (28), pas next/image
            <img
              key={option.id}
              src={option.image.src}
              alt={option.image.alt}
              aria-hidden={option.id !== selectedId}
              loading={index < 2 ? "eager" : "lazy"}
              className="swatch-crossfade absolute inset-0 h-full w-full object-cover"
              style={{ opacity: option.id === selectedId ? 1 : 0 }}
            />
          ))}
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-3"
      >
        {options.map((option, index) => (
          <Swatch
            key={option.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            name={option.name}
            color={option.color}
            selected={option.id === selectedId}
            tabIndex={option.id === selectedId ? 0 : -1}
            onSelect={() => selectId(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
