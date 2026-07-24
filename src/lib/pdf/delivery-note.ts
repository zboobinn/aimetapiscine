import "server-only";

import PDFDocument from "pdfkit";

import { getCompanyInfo } from "./company-info";
import { formatOrderDate, formatShippingAddress } from "./format";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR, registerPdfFonts } from "./register-fonts";
import type { OrderDocumentData } from "./types";

/**
 * Bon de livraison blind shipping (11) : en-tête NOTRE société uniquement,
 * mention obligatoire bien visible, AUCUN prix (le colis arrive chez le
 * client final). `ref_apf` (référence fournisseur réelle, `product_variants`,
 * tranche 2) reste affiché en tant que référence de préparation — ce n'est
 * pas une « mention APF » à masquer, c'est le seul document qui la voit.
 */
export function generateDeliveryNotePdf(data: OrderDocumentData): Promise<Buffer> {
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
    doc.font(PDF_FONT_REGULAR).fontSize(10).text(company.address);
    doc.moveDown(1.5);

    doc.font(PDF_FONT_BOLD).fontSize(14).text("Bon de livraison");
    doc.font(PDF_FONT_REGULAR).fontSize(10);
    doc.text(`Commande n° ${data.orderId}`);
    doc.text(`Date : ${formatOrderDate(data.createdAt)}`);
    doc.moveDown(1);

    doc.save();
    const warningTop = doc.y;
    doc.rect(50, warningTop, doc.page.width - 100, 40).fillAndStroke("#fbeaea", "#c0392b");
    doc
      .fillColor("#c0392b")
      .font(PDF_FONT_BOLD)
      .fontSize(11)
      .text("BLIND SHIPPING — Ne joindre aucune facture APF au colis", 60, warningTop + 13, {
        width: doc.page.width - 120,
      });
    doc.restore();
    doc.moveDown(3);

    doc.font(PDF_FONT_BOLD).fontSize(11).text("Adresse de livraison");
    doc.font(PDF_FONT_REGULAR).fontSize(10);
    for (const line of formatShippingAddress(data.shippingAddress)) {
      doc.text(line);
    }
    doc.moveDown(1.5);

    const tableTop = doc.y;
    const col = { sku: 50, name: 160, qty: 470 };

    doc.font(PDF_FONT_BOLD).fontSize(10);
    doc.text("Réf. APF", col.sku, tableTop);
    doc.text("Désignation", col.name, tableTop);
    doc.text("Quantité", col.qty, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(doc.page.width - 50, tableTop + 15).stroke();

    doc.font(PDF_FONT_REGULAR).fontSize(10);
    let rowY = tableTop + 22;
    for (const line of data.lines) {
      doc.text(line.refApf, col.sku, rowY, { width: col.name - col.sku - 10 });
      doc.text(line.name, col.name, rowY, { width: col.qty - col.name - 10 });
      doc.text(String(line.quantity), col.qty, rowY);
      rowY += 20;
    }

    doc.end();
  });
}
