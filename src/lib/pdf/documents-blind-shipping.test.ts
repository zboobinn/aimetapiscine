import { describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";

import { generateDeliveryNotePdf } from "./delivery-note";
import { generateInvoicePdf } from "./invoice";
import type { InvoiceDocumentData, OrderDocumentData, OrderDocumentLine } from "./types";

/**
 * Extension du garde-fou blind shipping (23a, `lib/cart/blind-shipping.test.ts`)
 * aux DEUX documents PDF envoyés en pièce jointe (11) : la facture client ne
 * doit jamais porter le SKU fournisseur (préfixé APF-..., 01) ; le BL
 * fournisseur doit TOUJOURS le porter (nécessaire à la préparation
 * logistique côté APF, qui ne voit jamais le client final).
 *
 * LIMITE ASSUMÉE : ces tests espionnent les appels `doc.text()`/`doc.image()`
 * et l'objet `doc.info` — c'est-à-dire ce qui est PASSÉ à pdfkit, pas ce qui
 * est effectivement rendu dans les octets du PDF final. pdfkit embarque PT
 * Sans en sous-ensemble TTF (décision 2026-07-07, Turbopack cassait les .afm
 * Helvetica) : le texte est encodé en glyph IDs 2 octets dans le flux de
 * contenu (`TJ`), vérifié empiriquement (décision 2026-07-16) — une recherche
 * de sous-chaîne dans les octets rendus, même décompressés, ne peut PAS
 * détecter une fuite. Écrire un décodeur de CMap pour lire le PDF final
 * introduirait un mécanisme de mesure plus complexe que le code mesuré, donc
 * moins digne de confiance que ce point d'appel. Une fuite empruntant un
 * autre chemin que doc.text/doc.info/doc.image échapperait à ce garde-fou.
 */

process.env.COMPANY_NAME = "Membranes Armées SAS";
process.env.COMPANY_SIREN = "123456789";
process.env.COMPANY_VAT = "FR12345678901";
process.env.COMPANY_ADDRESS = "1 rue de la Piscine, 75000 Paris";

const SUPPLIER_SKU = "APF-MEMB-UNI-BLEU";

const fixtureLine: OrderDocumentLine = {
  sku: SUPPLIER_SKU,
  name: "Membrane armée unie bleue",
  quantity: 2,
  unitPriceHtCents: 12000,
  discountBps: 0,
  vatRateBps: 2000,
};

const shippingAddress = {
  name: "Jean Dupont",
  address: {
    line1: "1 rue Test",
    line2: null,
    postal_code: "75000",
    city: "Paris",
    country: "FR",
  },
};

const orderDocumentData: OrderDocumentData = {
  orderId: "ORDER-TEST-0001",
  createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
  shippingAddress,
  lines: [fixtureLine],
};

const invoiceDocumentData: InvoiceDocumentData = {
  ...orderDocumentData,
  invoiceNumber: 1,
  customerEmail: "client@example.com",
  shippingFeeCents: 0,
};

interface CapturedCalls {
  texts: string[];
  images: string[];
  info: PDFKit.DocumentInfo | undefined;
}

async function generateAndCapture(generator: () => Promise<Buffer>): Promise<CapturedCalls> {
  const texts: string[] = [];
  const images: string[] = [];
  let info: PDFKit.DocumentInfo | undefined;

  const originalText = PDFDocument.prototype.text;
  const originalImage = PDFDocument.prototype.image;

  const textSpy = vi
    .spyOn(PDFDocument.prototype, "text")
    .mockImplementation(function (this: PDFKit.PDFDocument, ...args: unknown[]) {
      if (typeof args[0] === "string") texts.push(args[0]);
      info = this.info;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalText as any).apply(this, args);
    });

  const imageSpy = vi
    .spyOn(PDFDocument.prototype, "image")
    .mockImplementation(function (this: PDFKit.PDFDocument, ...args: unknown[]) {
      if (typeof args[0] === "string") images.push(args[0]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalImage as any).apply(this, args);
    });

  try {
    await generator();
  } finally {
    textSpy.mockRestore();
    imageSpy.mockRestore();
  }

  return { texts, images, info };
}

describe("blind shipping — documents PDF (11/23)", () => {
  it("la facture client ne mentionne jamais le sku fournisseur ni APF", async () => {
    const { texts } = await generateAndCapture(() => generateInvoicePdf(invoiceDocumentData));

    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toContain(SUPPLIER_SKU);
      expect(text).not.toMatch(/APF/i);
    }
  });

  it("le BL fournisseur porte toujours le sku exact du produit", async () => {
    const { texts } = await generateAndCapture(() => generateDeliveryNotePdf(orderDocumentData));

    expect(texts.some((text) => text === SUPPLIER_SKU)).toBe(true);
  });

  it("les métadonnées PDF (doc.info) ne mentionnent jamais APF, sur les deux documents", async () => {
    const invoiceResult = await generateAndCapture(() => generateInvoicePdf(invoiceDocumentData));
    const deliveryResult = await generateAndCapture(() => generateDeliveryNotePdf(orderDocumentData));

    for (const info of [invoiceResult.info, deliveryResult.info]) {
      expect(JSON.stringify(info ?? {})).not.toMatch(/APF/i);
    }
  });

  it("aucun chemin d'image passé à pdfkit ne contient APF (défense en profondeur, 23a)", async () => {
    const invoiceResult = await generateAndCapture(() => generateInvoicePdf(invoiceDocumentData));
    const deliveryResult = await generateAndCapture(() => generateDeliveryNotePdf(orderDocumentData));

    for (const path of [...invoiceResult.images, ...deliveryResult.images]) {
      expect(path).not.toMatch(/APF/i);
    }
  });
});
