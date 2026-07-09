import "server-only";

import { getApfEnv, getSiteEnv } from "@/lib/env";
import { formatShippingAddress } from "@/lib/pdf/format";
import type { OrderDocumentLine, OrderShippingAddress } from "@/lib/pdf/types";
import { computeLineChargeFromUnitHt } from "@/lib/pricing/resolve-price";
import { sendEmail } from "./send-email";
import { AdminProcessingErrorEmail } from "./templates/admin-processing-error";
import { OrderConfirmationEmail } from "./templates/order-confirmation";
import { ProActivatedEmail } from "./templates/pro-activated";
import { SupplierShippingOrderEmail } from "./templates/supplier-shipping-order";

/**
 * Seul module autorisé à construire les emails métier (17) : résout les
 * destinataires (env) et met en forme les données (montants, adresse) avant
 * de déléguer l'envoi à `sendEmail()` — jamais d'appel Resend ailleurs.
 */

interface OrderConfirmationInput {
  orderId: string;
  createdAt: string;
  invoiceNumber: number | null;
  customerEmail: string;
  lines: OrderDocumentLine[];
  shippingFeeCents: number;
  invoicePdf: Buffer;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<void> {
  const lines = input.lines.map((line) => {
    const totals = computeLineChargeFromUnitHt(
      line.unitPriceHtCents,
      line.quantity,
      line.discountBps,
      line.vatRateBps,
    );
    return { name: line.name, quantity: line.quantity, lineTtcCents: totals.lineTtcCents };
  });
  const totalTtcCents = lines.reduce((sum, line) => sum + line.lineTtcCents, 0) + input.shippingFeeCents;
  const orderReference = input.invoiceNumber ?? input.orderId;

  await sendEmail({
    to: input.customerEmail,
    subject: `Confirmation de votre commande n° ${orderReference}`,
    react: OrderConfirmationEmail({
      orderId: input.orderId,
      createdAt: input.createdAt,
      lines,
      shippingFeeCents: input.shippingFeeCents,
      totalTtcCents,
      accountOrdersUrl: `${getSiteEnv().NEXT_PUBLIC_SITE_URL}/compte`,
    }),
    attachments: [{ filename: `facture-${orderReference}.pdf`, content: input.invoicePdf }],
  });
}

interface SupplierShippingOrderInput {
  orderId: string;
  createdAt: string;
  lines: OrderDocumentLine[];
  shippingAddress: OrderShippingAddress;
  deliveryNotePdf: Buffer;
}

export async function sendSupplierShippingOrderEmail(input: SupplierShippingOrderInput): Promise<void> {
  await sendEmail({
    to: getApfEnv().APF_LOGISTICS_EMAIL,
    subject: `[BLIND SHIPPING] Commande ${input.orderId}`,
    react: SupplierShippingOrderEmail({
      orderId: input.orderId,
      createdAt: input.createdAt,
      lines: input.lines.map((line) => ({ sku: line.sku, name: line.name, quantity: line.quantity })),
      shippingAddressLines: formatShippingAddress(input.shippingAddress),
    }),
    attachments: [{ filename: `bl-${input.orderId}.pdf`, content: input.deliveryNotePdf }],
  });
}

interface AdminProcessingErrorInput {
  orderId: string;
  sessionId: string;
  message: string;
}

export async function sendAdminProcessingErrorEmail(input: AdminProcessingErrorInput): Promise<void> {
  await sendEmail({
    to: getApfEnv().ADMIN_ALERT_EMAIL,
    subject: `Commande ${input.orderId} bloquée — intervention requise`,
    react: AdminProcessingErrorEmail(input),
  });
}

export async function sendProActivatedEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Votre compte professionnel est activé",
    react: ProActivatedEmail({ accountUrl: `${getSiteEnv().NEXT_PUBLIC_SITE_URL}/compte` }),
  });
}
