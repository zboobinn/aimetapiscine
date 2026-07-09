import "server-only";

import PDFDocument from "pdfkit";

import { getCompanyInfo } from "./company-info";
import { formatCents, formatOrderDate, formatShippingAddress } from "./format";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR, registerPdfFonts } from "./register-fonts";
import type { InvoiceDocumentData } from "./types";
import {
  STANDARD_VAT_RATE_BPS,
  computeLineChargeFromUnitHt,
  splitTtcAmount,
} from "@/lib/pricing/resolve-price";

/**
 * Même formule que le panier/checkout (10/13/14, `lib/pricing/resolve-price.ts`)
 * appliquée ici au snapshot déjà enregistré (`order_items`) plutôt qu'au
 * catalogue live : une commande passée ne doit jamais changer si le catalogue
 * évolue (03), mais le calcul HT → remise → TVA → TTC reste identique.
 */
function computeLineTotals(line: InvoiceDocumentData["lines"][number]) {
  return computeLineChargeFromUnitHt(
    line.unitPriceHtCents,
    line.quantity,
    line.discountBps,
    line.vatRateBps,
  );
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
      totalHt += totals.lineHtCents;
      totalVat += totals.lineVatCents;
      totalDiscount += totals.discountHtCents;

      // Jamais le SKU (préfixé APF-..., référence fournisseur interne, 01) sur
      // un document client — seul le BL fournisseur (delivery-note.ts) le
      // porte, lui n'étant jamais vu par le client (23, decisions.md).
      doc.text(line.name, col.name, rowY, { width: col.qty - col.name - 10 });
      doc.text(String(line.quantity), col.qty, rowY);
      doc.text(formatCents(line.unitPriceHtCents), col.pu, rowY);
      doc.text(line.discountBps > 0 ? `-${line.discountBps / 100}%` : "—", col.discount, rowY);
      doc.text(formatCents(totals.lineHtCents), col.ht, rowY);
      doc.text(formatCents(totals.lineVatCents), col.vat, rowY);
      rowY += 20;
    }

    // Frais de livraison (12) : SEULEMENT si un montant a été réellement
    // encaissé pour cette commande (`orders.shipping_fee`) — absent en mode
    // `included` sans surcoût Corse (port fondu dans les prix produits,
    // aucune ligne à 0 € qui prêterait à confusion). Le montant est déjà
    // TTC (ce que Stripe a facturé, 10) : la TVA est un résidu (jamais un
    // second arrondi indépendant), pour que Total HT + Total TVA du port
    // redonne EXACTEMENT `shippingFeeCents` — condition nécessaire pour que
    // le Total TTC de la facture égale, au centime près, le montant Stripe
    // réellement encaissé (= « Total à payer » du panier, 09/14).
    if (data.shippingFeeCents > 0) {
      const { htCents: shippingHtCents, vatCents: shippingVatCents } = splitTtcAmount(
        data.shippingFeeCents,
        STANDARD_VAT_RATE_BPS,
      );
      totalHt += shippingHtCents;
      totalVat += shippingVatCents;

      doc.text("Frais de livraison", col.name, rowY, { width: col.qty - col.name - 10 });
      doc.text("1", col.qty, rowY);
      doc.text(formatCents(shippingHtCents), col.pu, rowY);
      doc.text("—", col.discount, rowY);
      doc.text(formatCents(shippingHtCents), col.ht, rowY);
      doc.text(formatCents(shippingVatCents), col.vat, rowY);
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
