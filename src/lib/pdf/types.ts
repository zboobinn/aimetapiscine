export interface OrderDocumentLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceHtCents: number;
  discountBps: number;
  vatRateBps: number;
}

export interface OrderShippingAddress {
  name: string | null;
  address: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
}

export interface OrderDocumentData {
  orderId: string;
  createdAt: string;
  shippingAddress: OrderShippingAddress;
  lines: OrderDocumentLine[];
}

export interface InvoiceDocumentData extends OrderDocumentData {
  invoiceNumber: number;
  customerEmail: string;
}
