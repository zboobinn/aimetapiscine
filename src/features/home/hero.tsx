"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import Link from "next/link";
import { PoolImage } from "@/components/media/pool-image";
import { Bleed } from "@/components/nuancier/bleed";
import type { HeroSwatchOption } from "./hero-swatch-options";

export interface HeroProps {
  swatchOptions: HeroSwatchOption[];
}

/** Intervalle de rotation automatique du carrousel (passe D). */
const ROTATION_MS = 6000;

/**
 * Hero (30 §01) — passe D : défilement automatique des 3 photos de coloris
 * (bleu / gris-anthracite / nuage) à la place des swatches. D4 est AMENDÉ
 * (docs/decisions.md) : le hero a désormais un mouvement (crossfade auto), et
 * « aucun carrousel auto » sort du critère de done de la 30.
 *
 * Le mouvement est piloté par `setInterval` + la classe CSS `.swatch-crossfade`
 * existante (crossfade ≤120ms) — ZÉRO librairie d'animation (garde-fou CI 28a).
 *
 * Accessibilité (WCAG 2.2.2, non négociable) :
 * - `prefers-reduced-motion: reduce` → aucune rotation (photo 1 fixe), points
 *   toujours cliquables.
 * - Pause au survol (souris) ET au focus clavier.
 * - La rotation ne démarre qu'APRÈS le chargement de la 1ʳᵉ image (ne dégrade
 *   pas le LCP).
 */
export function Hero({ swatchOptions }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const count = swatchOptions.length;

  const goTo = (index: number) => setActiveIndex(((index % count) + count) % count);
  const goNext = () => goTo(activeIndex + 1);

  // Respecte `prefers-reduced-motion` (et ses changements en cours de session).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // La rotation ne démarre qu'après le chargement réel de la 1ʳᵉ image (LCP).
  // On lit l'`<img>` déjà rendu par `<PoolImage>` (index 0, priority) — sans
  // toucher à `PoolImage` (couture 29.0) ni émettre de requête supplémentaire.
  useEffect(() => {
    const img = stageRef.current?.querySelector("img");
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setFirstLoaded(true);
      return;
    }
    const onLoad = () => setFirstLoaded(true);
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, []);

  // Rotation automatique — désactivée si : une seule photo, 1ʳᵉ image pas
  // encore chargée, en pause (survol/focus), ou mouvement réduit.
  useEffect(() => {
    if (count <= 1 || !firstLoaded || paused || reducedMotion) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % count);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [count, firstLoaded, paused, reducedMotion]);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={handleBlur}
    >
      <Bleed>
        <div
          ref={stageRef}
          className="relative isolate flex items-center justify-center overflow-hidden"
          style={{ minHeight: "clamp(34rem, 80vh, 46rem)" }}
        >
          {/*
           * LCP (30 §01) : seule la 1ʳᵉ photo garde `priority`/`fetchPriority`
           * high ; la 2ᵉ est préchargée par un `<link rel="preload">` (hoisté
           * en <head> par React) ; la 3ᵉ reste lazy (`priority={false}`).
           */}
          {swatchOptions[1] ? (
            <link rel="preload" as="image" href={swatchOptions[1].image.src} />
          ) : null}

          {swatchOptions.map((option, index) => (
            <PoolImage
              key={option.id}
              colorisSlug={option.id}
              plan="bassin"
              priority={index === 0}
              fetchPriority={index === 0 ? "high" : undefined}
              ariaHidden={index !== activeIndex}
              className={`swatch-crossfade absolute inset-0 h-full w-full object-cover ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/*
           * Scrim (D4/D18 — pas de text-shadow, pas d'ombre) : calque sombre
           * entre la photo et le texte pour garantir le contraste AA du titre
           * et du sous-titre quelle que soit la photo — le coucher de soleil
           * est le cas limite. Base teintée `--ink` (#101314), renforcée en bas.
           */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,19,20,0.5) 0%, rgba(16,19,20,0.45) 50%, rgba(16,19,20,0.75) 100%)",
            }}
          />

          {/*
           * Clic sur l'image de fond → photo suivante. Bonus pointeur (les
           * points ci-dessous sont l'affordance clavier/AT) : hors du fil de
           * tabulation (`tabIndex={-1}`) pour ne pas dupliquer les points.
           * Sous le contenu (z-0) ; le contenu est `pointer-events-none` sauf
           * ses contrôles, donc un clic « dans le vide » du hero tombe ici.
           */}
          {count > 1 ? (
            <button
              type="button"
              aria-label="Afficher la photo suivante"
              tabIndex={-1}
              onClick={goNext}
              className="absolute inset-0 z-0 cursor-pointer"
            />
          ) : null}

          <div
            className="pointer-events-none relative z-10 mx-auto flex w-full flex-col items-center gap-6 px-4 py-16 text-center sm:px-6"
            style={{ maxWidth: "var(--page-max)" }}
          >
            <div className="flex flex-col items-center gap-3">
              <p className="text-[var(--step--1)]" style={{ color: "rgba(255,255,255,0.82)" }}>
                Membrane armée sur mesure
              </p>
              <h1
                className="font-display uppercase"
                style={{
                  fontSize: "var(--step-4)",
                  lineHeight: "var(--lh-tight)",
                  letterSpacing: "var(--tracking-display)",
                  color: "var(--surface)",
                }}
              >
                Votre bassin, sans mauvaise surprise de cote
              </h1>
              <p
                className="mx-auto"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: "var(--lh-body)",
                  maxWidth: "var(--measure)",
                }}
              >
                Calculez votre besoin en rouleaux et repartez avec un pack prêt à poser
                — membrane et accessoires inclus.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/membrane-armee"
                className="pointer-events-auto px-5 py-3 text-center font-medium"
                style={{
                  borderRadius: "var(--radius)",
                  color: "var(--surface)",
                  background: "var(--deep-blue)",
                }}
              >
                Découvrir nos membranes
              </Link>
              <Link
                href="/calculateur"
                className="pointer-events-auto border px-5 py-3 text-center font-medium"
                style={{
                  borderRadius: "var(--radius)",
                  color: "var(--surface)",
                  borderColor: "rgba(255,255,255,0.7)",
                }}
              >
                Calculer ma membrane
              </Link>
            </div>
          </div>

          {/*
           * Points de contrôle (affordance du carrousel + pause implicite au
           * focus). Actif en `--deep-blue`, JAMAIS `--turquoise` (D1). Cible
           * tactile élargie par le padding (≥24px, WCAG 2.5.8).
           */}
          {count > 1 ? (
            <div
              role="group"
              aria-label="Choisir la photo affichée"
              className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-1"
            >
              {swatchOptions.map((option, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Afficher le coloris ${option.name}`}
                    aria-current={active ? "true" : undefined}
                    className="flex items-center justify-center p-2"
                  >
                    <span
                      aria-hidden="true"
                      className="block h-2.5 rounded-full transition-all"
                      style={{
                        width: active ? "1.5rem" : "0.625rem",
                        background: active ? "var(--deep-blue)" : "rgba(255,255,255,0.55)",
                        border: active ? "1px solid rgba(255,255,255,0.75)" : "none",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </Bleed>
    </section>
  );
}
