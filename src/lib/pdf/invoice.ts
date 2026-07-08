import "server-only";

import PDFDocument from "pdfkit";

import { getCompanyInfo } from "./company-info";
import { formatCents, formatOrderDate, formatShippingAddress } from "./format";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR, registerPdfFonts } from "./register-fonts";
import type { InvoiceDocumentData } from "./types";

interface InvoiceLineTotals {
  htBeforeDiscount: number;
  discount: number;
  ht: number;
  vat: number;
  ttc: number;
}

function computeLineTotals(line: InvoiceDocumentData["lines"][number]): InvoiceLineTotals {
  const htBeforeDiscount = line.unitPriceHtCents * line.quantity;
  const discount = Math.round((htBeforeDiscount * line.discountBps) / 10000);
  const ht = htBeforeDiscount - discount;
  const vat = Math.round((ht * line.vatRateBps) / 10000);
  return { htBeforeDiscount, discount, ht, vat, ttc: ht + vat };
}

/**
 * Facture client (11) : émise par NOTRE société, numérotation séquentielle
 * continue (via `next_invoice_number()`, séquence DB — 03), HT/TVA/TTC et
 * remises visibles par ligne.
 */
export function generateInvoicePdf(data: InvoiceDocumentData): Promise<Buffer> {
  const company = getCompanyInfo();

  return new Promise((resolve, reject) => {
    // `font: false` : évite l'appel implicite à `.font("Helvetica")` fait
    // par le constructeur pdfkit (`initFonts`), qui déclenche la lecture
    // de l'AFM standard et casse sous Turbopack/Vercel (register-fonts.ts).
    // Cast nécessaire : @types/pdfkit ne déclare pas `false` comme valeur
    // possible pour `font`, alors que pdfkit le supporte à l'exécution.
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      font: false,
    } as unknown as PDFKit.PDFDocumentOptions);
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerPdfFonts(doc);

    doc.font(PDF_FONT_BOLD).fontSize(16).text(company.name);
    doc.font(PDF_FONT_REGULAR).fontSize(10);
    doc.text(company.address);
    doc.text(`SIREN ${company.siren} — TVA intracommunautaire ${company.vat}`);
    doc.moveDown(1.5);

    doc.font(PDF_FONT_BOLD).fontSize(14).text(`Facture n° ${data.invoiceNumber}`);
    doc.font(PDF_FONT_REGULAR).fontSize(10);
    doc.text(`Date : ${formatOrderDate(data.createdAt)}`);
    doc.text(`Commande n° ${data.orderId}`);
    doc.moveDown(1);

    doc.font(PDF_FONT_BOLD).fontSize(11).text("Facturé à");
    doc.font(PDF_FONT_REGULAR).fontSize(10);
    for (const line of formatShippingAddress(data.shippingAddress)) {
      doc.text(line);
    }
    doc.text(data.customerEmail);
    doc.moveDown(1.5);

    const col = { name: 50, qty: 260, pu: 310, discount: 375, ht: 440, vat: 500 };
    const tableTop = doc.y;

    doc.font(PDF_FONT_BOLD).fontSize(9);
    doc.text("Désignation", col.name, tableTop);
    doc.text("Qté", col.qty, tableTop);
    doc.text("PU HT", col.pu, tableTop);
    doc.text("Remise", col.discount, tableTop);
    doc.text("Total HT", col.ht, tableTop);
    doc.text("TVA", col.vat, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(doc.page.width - 50, tableTop + 14).stroke();

    doc.font(PDF_FONT_REGULAR).fontSize(9);
    let rowY = tableTop + 20;
    let totalHt = 0;
    let totalVat = 0;
    let totalDiscount = 0;

    for (const line of data.lines) {
      const totals = computeLineTotals(line);
      totalHt += totals.ht;
      totalVat += totals.vat;
      totalDiscount += totals.discount;

      doc.text(`${line.name} (${line.sku})`, col.name, rowY, { width: col.qty - col.name - 10 });
      doc.text(String(line.quantity), col.qty, rowY);
      doc.text(formatCents(line.unitPriceHtCents), col.pu, rowY);
      doc.text(line.discountBps > 0 ? `-${line.discountBps / 100}%` : "—", col.discount, rowY);
      doc.text(formatCents(totals.ht), col.ht, rowY);
      doc.text(formatCents(totals.vat), col.vat, rowY);
      rowY += 20;
    }

    const totalTtc = totalHt + totalVat;

    doc.moveTo(50, rowY + 5).lineTo(doc.page.width - 50, rowY + 5).stroke();
    let summaryY = rowY + 15;

    if (totalDiscount > 0) {
      doc.font(PDF_FONT_REGULAR).fontSize(10);
      doc.text(`Remise totale : -${formatCents(totalDiscount)}`, col.ht - 60, summaryY);
      summaryY += 16;
    }

    doc.font(PDF_FONT_REGULAR).fontSize(10);
    doc.text(`Total HT : ${formatCents(totalHt)}`, col.ht - 60, summaryY);
    summaryY += 16;
    doc.text(`TVA (20 %) : ${formatCents(totalVat)}`, col.ht - 60, summaryY);
    summaryY += 16;
    doc.font(PDF_FONT_BOLD).fontSize(11);
    doc.text(`Total TTC : ${formatCents(totalTtc)}`, col.ht - 60, summaryY);

    doc.end();
  });
}
