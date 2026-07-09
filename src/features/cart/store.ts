"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, CartPackMeta } from "./types";

interface CartState {
  lines: CartLine[];
  packs: Record<string, CartPackMeta>;
  /** Ajoute (ou incrémente) une ligne hors pack — ajout produit seul depuis une fiche (09). */
  addCatalogLine: (slug: string, quantity?: number) => void;
  /** Ajoute toutes les lignes d'un Pack Prêt à Poser (08), groupées sous un nouveau `packId`. */
  addPackLines: (lines: Array<{ slug: string; quantity: number }>, calculatorParams: string) => string;
  updateQuantity: (slug: string, packId: string | undefined, quantity: number) => void;
  removeLine: (slug: string, packId: string | undefined) => void;
  removePack: (packId: string) => void;
  clear: () => void;
}

function samePosition(line: CartLine, slug: string, packId: string | undefined): boolean {
  return line.slug === slug && line.packId === packId;
}

/**
 * Version 1 du panier : `CartLine.sku` a été remplacé par `CartLine.slug`
 * (23, fuite blind shipping) — un panier persisté avant ce changement
 * contient des `sku` (APF-...) et planterait à la résolution serveur
 * (`/api/cart/resolve` ne connaît plus que `slug`). `migrate()` vide un
 * panier d'une version antérieure plutôt que de tenter une conversion :
 * un panier perdu est un inconvénient mineur, un crash silencieux ne l'est
 * pas.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      packs: {},

      addCatalogLine: (slug, quantity = 1) => {
        set((state) => {
          const existing = state.lines.find((line) => samePosition(line, slug, undefined));

          if (existing) {
            return {
              lines: state.lines.map((line) =>
                samePosition(line, slug, undefined)
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
              ),
            };
          }

          return {
            lines: [...state.lines, { slug, quantity, source: "catalog" as const }],
          };
        });
      },

      addPackLines: (lines, calculatorParams) => {
        const packId = crypto.randomUUID();
        const originalSlugs = Array.from(new Set(lines.map(({ slug }) => slug)));

        set((state) => ({
          lines: [
            ...state.lines,
            ...lines.map(({ slug, quantity }) => ({
              slug,
              quantity,
              source: "pack" as const,
              packId,
            })),
          ],
          packs: { ...state.packs, [packId]: { calculatorParams, originalSlugs } },
        }));

        return packId;
      },

      updateQuantity: (slug, packId, quantity) => {
        if (quantity <= 0) {
          get().removeLine(slug, packId);
          return;
        }

        set((state) => ({
          lines: state.lines.map((line) =>
            samePosition(line, slug, packId) ? { ...line, quantity } : line,
          ),
        }));
      },

      removeLine: (slug, packId) => {
        set((state) => ({
          lines: state.lines.filter((line) => !samePosition(line, slug, packId)),
        }));
      },

      removePack: (packId) => {
        set((state) => {
          const packs = { ...state.packs };
          delete packs[packId];
          return {
            lines: state.lines.filter((line) => line.packId !== packId),
            packs,
          };
        });
      },

      clear: () => set({ lines: [], packs: {} }),
    }),
    {
      name: "cart-storage",
      version: 1,
      migrate: () => ({ lines: [], packs: {} }),
    },
  ),
);
