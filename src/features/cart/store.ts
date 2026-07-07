"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, CartPackMeta } from "./types";

interface CartState {
  lines: CartLine[];
  packs: Record<string, CartPackMeta>;
  /** Ajoute (ou incrémente) une ligne hors pack — ajout produit seul depuis une fiche (09). */
  addCatalogLine: (sku: string, quantity?: number) => void;
  /** Ajoute toutes les lignes d'un Pack Prêt à Poser (08), groupées sous un nouveau `packId`. */
  addPackLines: (lines: Array<{ sku: string; quantity: number }>, calculatorParams: string) => string;
  updateQuantity: (sku: string, packId: string | undefined, quantity: number) => void;
  removeLine: (sku: string, packId: string | undefined) => void;
  removePack: (packId: string) => void;
  clear: () => void;
}

function samePosition(line: CartLine, sku: string, packId: string | undefined): boolean {
  return line.sku === sku && line.packId === packId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      packs: {},

      addCatalogLine: (sku, quantity = 1) => {
        set((state) => {
          const existing = state.lines.find((line) => samePosition(line, sku, undefined));

          if (existing) {
            return {
              lines: state.lines.map((line) =>
                samePosition(line, sku, undefined)
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
              ),
            };
          }

          return {
            lines: [...state.lines, { sku, quantity, source: "catalog" as const }],
          };
        });
      },

      addPackLines: (lines, calculatorParams) => {
        const packId = crypto.randomUUID();

        set((state) => ({
          lines: [
            ...state.lines,
            ...lines.map(({ sku, quantity }) => ({
              sku,
              quantity,
              source: "pack" as const,
              packId,
            })),
          ],
          packs: { ...state.packs, [packId]: { calculatorParams } },
        }));

        return packId;
      },

      updateQuantity: (sku, packId, quantity) => {
        if (quantity <= 0) {
          get().removeLine(sku, packId);
          return;
        }

        set((state) => ({
          lines: state.lines.map((line) =>
            samePosition(line, sku, packId) ? { ...line, quantity } : line,
          ),
        }));
      },

      removeLine: (sku, packId) => {
        set((state) => ({
          lines: state.lines.filter((line) => !samePosition(line, sku, packId)),
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
    { name: "cart-storage" },
  ),
);
