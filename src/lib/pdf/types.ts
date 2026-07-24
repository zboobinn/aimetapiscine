export interface OrderDocumentLine {
  /** Référence fournisseur réelle (`product_variants.ref_apf`, server-only, 01/23/27) — jamais sur la facture client, uniquement sur le BL fournisseur. */
  refApf: string;
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
  /**
   * Montant RÉELLEMENT encaissé par Stripe pour la livraison de CETTE
   * commande (`orders.shipping_fee`, déjà TTC — 10/12), surcoût Corse
   * éventuel inclus. `0` en mode `included` (port fondu dans les prix
   * produits, 12) sans surcoût Corse : aucune ligne livraison sur la
   * facture dans ce cas, jamais une ligne à 0 €.
   */
  shippingFeeCents: number;
}
