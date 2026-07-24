import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `createOrderFromSession` (tranche 2) : `order_items.variant_id` doit être
 * écrit tel quel depuis `variant_id` en métadonnée Stripe (déposé par
 * `/api/checkout`) — plus de résolution `product_id` par `sku` (retiré,
 * `order_items_variant` migration). Teste CETTE fonction directement
 * (exportée pour les tests, 24), avec un client Stripe et un client Supabase
 * mockés légers, jamais de vraie session Stripe ni de vraie base (hors
 * périmètre V1).
 */

const retrieveSession = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { retrieve: (...args: unknown[]) => retrieveSession(...args) } },
  }),
}));

import { createOrderFromSession } from "./route";

const VARIANT_MEMBRANE = "11111111-1111-1111-1111-111111111111";
const VARIANT_ACCESSORY = "22222222-2222-2222-2222-222222222222";

function makeLineItem(overrides: {
  variantId?: string;
  unitHtCents: number;
  discountBps: number;
  quantity: number;
  amountTotal: number;
}) {
  return {
    quantity: 1, // toujours 1 côté Stripe (13/23) — la vraie quantité voyage en métadonnée
    amount_total: overrides.amountTotal,
    price: {
      product: {
        metadata: {
          ...(overrides.variantId !== undefined ? { variant_id: overrides.variantId } : {}),
          unit_ht_cents: String(overrides.unitHtCents),
          discount_bps: String(overrides.discountBps),
          quantity: String(overrides.quantity),
        },
      },
    },
  };
}

interface FakeSupabase {
  from: ReturnType<typeof vi.fn>;
  insertedOrderItems: Array<Record<string, unknown>>;
}

function createFakeSupabase(orderRow: Record<string, unknown>): FakeSupabase {
  const insertedOrderItems: Array<Record<string, unknown>> = [];

  const from = vi.fn((table: string) => {
    if (table === "orders") {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: orderRow, error: null }),
          }),
        }),
      };
    }

    if (table === "order_items") {
      return {
        insert: (rows: Array<Record<string, unknown>>) => {
          insertedOrderItems.push(...rows);
          return Promise.resolve({ error: null });
        },
      };
    }

    throw new Error(`Table non mockée dans ce test : ${table}`);
  });

  return { from, insertedOrderItems };
}

const ORDER_ROW = {
  id: "order-1",
  created_at: "2026-01-01T10:00:00Z",
  customer_email: "client@example.com",
  shipping_address: { name: "Jean Dupont", address: null },
  status: "PAID",
  invoice_number: null,
  shipping_fee: 0,
  delivery_note_url: null,
  invoice_pdf_path: null,
  confirmation_email_sent_at: null,
  supplier_email_sent_at: null,
};

describe("createOrderFromSession — écriture order_items.variant_id (tranche 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("écrit variant_id (pas product_id/sku) pour une ligne membrane (m²) ET une ligne accessoire (unité)", async () => {
    retrieveSession.mockResolvedValue({
      id: "cs_test_123",
      line_items: {
        data: [
          makeLineItem({ variantId: VARIANT_MEMBRANE, unitHtCents: 100000, discountBps: 0, quantity: 2, amountTotal: 240000 }),
          makeLineItem({ variantId: VARIANT_ACCESSORY, unitHtCents: 1499, discountBps: 0, quantity: 3, amountTotal: 5396 }),
        ],
      },
      shipping_cost: null,
      collected_information: undefined,
      customer_details: { email: "client@example.com", name: "Jean Dupont", address: null },
      customer_email: null,
      metadata: { user_id: "" },
    });

    const supabase = createFakeSupabase(ORDER_ROW);

    // @ts-expect-error fake supabase client, mock léger volontaire (24)
    const order = await createOrderFromSession(supabase, "cs_test_123");

    expect(order.id).toBe("order-1");
    expect(supabase.insertedOrderItems).toEqual([
      expect.objectContaining({ variant_id: VARIANT_MEMBRANE, quantity: 2, unit_price_ht: 100000, discount_bps: 0 }),
      expect.objectContaining({ variant_id: VARIANT_ACCESSORY, quantity: 3, unit_price_ht: 1499, discount_bps: 0 }),
    ]);

    // Blind shipping (23/27) : aucune trace de sku/product_id — seul variant_id identifie la ligne.
    for (const row of supabase.insertedOrderItems) {
      expect(row).not.toHaveProperty("product_id");
      expect(row).not.toHaveProperty("sku");
    }
  });

  it("une ligne Stripe sans variant_id en métadonnées fait échouer la création (jamais de commande partielle silencieuse)", async () => {
    retrieveSession.mockResolvedValue({
      id: "cs_test_456",
      line_items: { data: [makeLineItem({ unitHtCents: 100000, discountBps: 0, quantity: 1, amountTotal: 120000 })] },
      shipping_cost: null,
      collected_information: undefined,
      customer_details: { email: "client@example.com", name: null, address: null },
      customer_email: null,
      metadata: {},
    });

    const supabase = createFakeSupabase(ORDER_ROW);

    await expect(
      // @ts-expect-error fake supabase client, mock léger volontaire (24)
      createOrderFromSession(supabase, "cs_test_456"),
    ).rejects.toThrow(/variant_id/);
  });
});
