import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Idempotence/séquencement des notifications de commande (17, décision
 * 2026-07-12) : `sendOrderNotifications` décide, à partir du seul état de la
 * commande, quels envois restent à faire. Teste CETTE fonction directement
 * (exportée pour les tests, 24 — portée élargie, comportement inchangé),
 * jamais le handler HTTP complet : pas de signature Stripe, pas de vraie
 * base Supabase (hors périmètre V1, cf. brief). Le client Supabase est un
 * mock léger reproduisant uniquement les méthodes de chaînage réellement
 * appelées par `sendOrderNotifications`/`loadDocumentLines`.
 */

vi.mock("@/lib/email/notifications", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendSupplierShippingOrderEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminProcessingErrorEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/storage", () => ({
  DELIVERY_NOTES_BUCKET: "delivery-notes",
  INVOICES_BUCKET: "invoices",
  downloadOrderDocument: vi.fn().mockResolvedValue(Buffer.from("pdf")),
  uploadOrderDocument: vi.fn().mockResolvedValue(undefined),
}));

import { sendOrderNotifications } from "./route";
import { sendOrderConfirmationEmail, sendSupplierShippingOrderEmail } from "@/lib/email/notifications";
import { downloadOrderDocument } from "@/lib/supabase/storage";

const DOCUMENT_LINES_ROW = {
  quantity: 1,
  unit_price_ht: 10000,
  discount_bps: 0,
  products: { sku: "APF-TEST-SKU", name: "Produit test", vat_rate: 2000 },
};

interface FakeSupabase {
  from: ReturnType<typeof vi.fn>;
  orderUpdates: Array<Record<string, unknown>>;
}

function createFakeSupabase(): FakeSupabase {
  const orderUpdates: Array<Record<string, unknown>> = [];

  const from = vi.fn((table: string) => {
    if (table === "orders") {
      return {
        update: (payload: Record<string, unknown>) => {
          orderUpdates.push(payload);
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    }

    if (table === "order_items") {
      return {
        select: () => ({
          eq: () => ({
            returns: () => Promise.resolve({ data: [DOCUMENT_LINES_ROW], error: null }),
          }),
        }),
      };
    }

    throw new Error(`Table non mockée dans ce test : ${table}`);
  });

  return { from, orderUpdates };
}

const baseOrder = {
  id: "order-1",
  created_at: "2026-01-01T10:00:00Z",
  customer_email: "client@example.com",
  shipping_address: { name: "Jean Dupont", address: null },
  status: "PAID",
  invoice_number: 1,
  shipping_fee: 0,
  delivery_note_url: "order-1.pdf",
  invoice_pdf_path: "order-1.pdf",
  confirmation_email_sent_at: null as string | null,
  supplier_email_sent_at: null as string | null,
};

describe("sendOrderNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commande neuve (aucun envoi encore fait) : les deux emails partent, statut passe SENT_TO_SUPPLIER", async () => {
    const supabase = createFakeSupabase();
    const order = { ...baseOrder };

    // @ts-expect-error fake supabase client, mock léger volontaire (24)
    await sendOrderNotifications(supabase, order, "sess_1");

    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(sendSupplierShippingOrderEmail).toHaveBeenCalledTimes(1);

    const confirmationUpdate = supabase.orderUpdates.find((u) => "confirmation_email_sent_at" in u);
    const supplierUpdate = supabase.orderUpdates.find((u) => "supplier_email_sent_at" in u);

    expect(confirmationUpdate).toBeDefined();
    expect(supplierUpdate).toMatchObject({ status: "SENT_TO_SUPPLIER" });
  });

  it("confirmation déjà envoyée : seul l'email fournisseur part", async () => {
    const supabase = createFakeSupabase();
    const order = { ...baseOrder, confirmation_email_sent_at: "2026-01-01T10:05:00Z" };

    // @ts-expect-error fake supabase client, mock léger volontaire (24)
    await sendOrderNotifications(supabase, order, "sess_2");

    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(sendSupplierShippingOrderEmail).toHaveBeenCalledTimes(1);

    const supplierUpdate = supabase.orderUpdates.find((u) => "supplier_email_sent_at" in u);
    expect(supplierUpdate).toMatchObject({ status: "SENT_TO_SUPPLIER" });
  });

  it("les deux emails déjà envoyés : aucun envoi, statut inchangé", async () => {
    const supabase = createFakeSupabase();
    const order = {
      ...baseOrder,
      status: "SENT_TO_SUPPLIER",
      confirmation_email_sent_at: "2026-01-01T10:05:00Z",
      supplier_email_sent_at: "2026-01-01T10:06:00Z",
    };

    // @ts-expect-error fake supabase client, mock léger volontaire (24)
    await sendOrderNotifications(supabase, order, "sess_3");

    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    expect(sendSupplierShippingOrderEmail).not.toHaveBeenCalled();
    expect(supabase.orderUpdates).toHaveLength(0);
  });

  it("échec de l'envoi fournisseur : le statut reste PAID, supplier_email_sent_at reste null", async () => {
    vi.mocked(downloadOrderDocument).mockImplementation(async (_supabase, bucket) => {
      if (bucket === "delivery-notes") throw new Error("Téléchargement BL échoué (simulé)");
      return Buffer.from("pdf");
    });

    const supabase = createFakeSupabase();
    const order = { ...baseOrder, confirmation_email_sent_at: "2026-01-01T10:05:00Z" };

    // @ts-expect-error fake supabase client, mock léger volontaire (24)
    await sendOrderNotifications(supabase, order, "sess_4");

    expect(sendSupplierShippingOrderEmail).not.toHaveBeenCalled();

    const supplierUpdate = supabase.orderUpdates.find((u) => "supplier_email_sent_at" in u);
    expect(supplierUpdate).toBeUndefined();

    const statusUpdate = supabase.orderUpdates.find((u) => "status" in u);
    expect(statusUpdate).toBeUndefined();
  });
});
