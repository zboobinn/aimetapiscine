import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripeWebhookEnv } from "@/lib/env";
import { generateDeliveryNotePdf } from "@/lib/pdf/delivery-note";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import type { OrderDocumentLine, OrderShippingAddress } from "@/lib/pdf/types";
import { getStripeClient } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { DELIVERY_NOTES_BUCKET, INVOICES_BUCKET, uploadOrderDocument } from "@/lib/supabase/storage";

/**
 * Webhook Stripe (10) : point pivot de l'encaissement, doit rester fiable
 * même en cas de retraitement. Body brut lu AVANT tout parsing (signature
 * vérifiée dessus, 23), idempotence par `stripe_session_id` (03), réponse
 * 200 rapide — toute erreur interne est renvoyée en 500 pour laisser
 * Stripe retenter (jamais avalée, 10/23).
 *
 * Enregistrement de la commande et génération des documents (BL/facture,
 * 11) sont deux phases DÉCOUPLÉES : un paiement encaissé ne doit jamais se
 * perdre parce qu'une génération PDF a échoué. Si la commande existe déjà
 * mais n'a pas avancé au-delà de `PAID` (jamais tentée, ou tentative
 * précédente en échec — voir `processing_error`), on retente uniquement la
 * génération des documents, sans jamais recréer la commande ni ses lignes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

interface OrderRecord {
  id: string;
  created_at: string;
  customer_email: string;
  shipping_address: OrderShippingAddress;
  status: string;
  invoice_number: number | null;
}

async function findOrderBySession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<OrderRecord | null> {
  const { data } = await supabase
    .from("orders")
    .select("id, created_at, customer_email, shipping_address, status, invoice_number")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  return data;
}

async function createOrderFromSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<OrderRecord> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "line_items.data.price.product"],
  });

  const items = session.line_items?.data ?? [];

  const orderItemsInput = items.map((item) => {
    const product = item.price?.product;
    const metadata = typeof product === "object" && product && !("deleted" in product && product.deleted)
      ? product.metadata
      : undefined;

    const sku = metadata?.sku;
    const unitHtCents = Number(metadata?.unit_ht_cents ?? 0);
    const quantity = item.quantity ?? 0;
    const unitAmountCents = item.price?.unit_amount ?? 0;

    if (!sku) {
      throw new Error(`Ligne Stripe sans SKU en métadonnées (session ${sessionId})`);
    }

    return { sku, quantity, unitHtCents, unitAmountCents };
  });

  const totalAmountHt = orderItemsInput.reduce(
    (sum, item) => sum + item.unitHtCents * item.quantity,
    0,
  );
  const totalCharged = orderItemsInput.reduce(
    (sum, item) => sum + item.unitAmountCents * item.quantity,
    0,
  );
  const totalVat = totalCharged - totalAmountHt;
  const shippingFee = session.shipping_cost?.amount_total ?? 0;

  const shippingDetails = session.collected_information?.shipping_details;
  const customerDetails = session.customer_details;

  const shippingAddress = shippingDetails
    ? { name: shippingDetails.name, address: shippingDetails.address }
    : { name: customerDetails?.name ?? null, address: customerDetails?.address ?? null };

  const customerEmail = customerDetails?.email ?? session.customer_email ?? "";
  const userId = session.metadata?.user_id || null;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, sku")
    .in(
      "sku",
      orderItemsInput.map((i) => i.sku),
    );

  if (productsError) {
    throw new Error(`Lecture produits échouée (session ${sessionId}) : ${productsError.message}`);
  }

  const productIdBySku = new Map((products ?? []).map((p) => [p.sku, p.id]));

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      customer_email: customerEmail,
      stripe_session_id: sessionId,
      total_amount_ht: totalAmountHt,
      total_vat: totalVat,
      shipping_fee: shippingFee,
      status: "PAID",
      shipping_address: shippingAddress,
    })
    .select("id, created_at, customer_email, shipping_address, status, invoice_number")
    .single();

  if (orderError) {
    if (orderError.code === UNIQUE_VIOLATION) {
      // Course concurrente entre deux livraisons du même événement : l'autre
      // a déjà créé la commande. On la reprend pour laisser l'appelant
      // (re)tenter la génération des documents si elle n'a pas abouti.
      const raceOrder = await findOrderBySession(supabase, sessionId);
      if (!raceOrder) {
        throw new Error(
          `Course concurrente : commande introuvable après conflit (session ${sessionId})`,
        );
      }
      return raceOrder;
    }
    throw new Error(`Création commande échouée (session ${sessionId}) : ${orderError.message}`);
  }

  const orderItemsRows = orderItemsInput.map((item) => {
    const productId = productIdBySku.get(item.sku);
    if (!productId) {
      throw new Error(`SKU ${item.sku} introuvable en DB (session ${sessionId})`);
    }

    return {
      order_id: order.id,
      product_id: productId,
      quantity: item.quantity,
      unit_price_ht: item.unitHtCents,
      // TODO spec 13 : discount_bps de la remise pack, une fois la
      // composition du pack propagée jusqu'au checkout.
      discount_bps: 0,
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsRows);

  if (itemsError) {
    // Rollback : mieux vaut aucune commande qu'une commande sans lignes.
    // Stripe retentera l'événement (retour 500 par l'appelant) et repartira
    // sur un essai complet.
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(`Création lignes de commande échouée (session ${sessionId}) : ${itemsError.message}`);
  }

  return order;
}

interface OrderItemWithProduct {
  quantity: number;
  unit_price_ht: number;
  discount_bps: number;
  products: { sku: string; name: string; vat_rate: number } | null;
}

async function loadDocumentLines(
  supabase: SupabaseClient,
  orderId: string,
): Promise<OrderDocumentLine[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, unit_price_ht, discount_bps, products(sku, name, vat_rate)")
    .eq("order_id", orderId)
    .returns<OrderItemWithProduct[]>();

  if (error) {
    throw new Error(`Lecture des lignes de commande échouée (commande ${orderId}) : ${error.message}`);
  }

  return (data ?? []).map((row) => {
    if (!row.products) {
      throw new Error(`Produit introuvable pour une ligne de commande ${orderId}`);
    }

    return {
      sku: row.products.sku,
      name: row.products.name,
      quantity: row.quantity,
      unitPriceHtCents: row.unit_price_ht,
      discountBps: row.discount_bps,
      vatRateBps: row.products.vat_rate,
    };
  });
}

/**
 * Génère et attache le BL + la facture à une commande déjà enregistrée
 * (nouvelle ou en reprise après échec). En cas d'échec à n'importe quelle
 * étape : la commande reste en `PAID`, `processing_error` est renseigné
 * pour un repérage immédiat dans Supabase Studio, et l'erreur est relancée
 * pour que l'appelant renvoie 500 (retraitement automatique Stripe +
 * rejeu manuel `stripe events resend` possibles, sans jamais dupliquer la
 * commande — cette fonction ne fait plus que mettre à jour la ligne
 * existante).
 */
async function generateAndAttachDocuments(
  supabase: SupabaseClient,
  order: OrderRecord,
  sessionId: string,
): Promise<void> {
  try {
    const documentLines = await loadDocumentLines(supabase, order.id);

    const deliveryNotePdf = await generateDeliveryNotePdf({
      orderId: order.id,
      createdAt: order.created_at,
      shippingAddress: order.shipping_address,
      lines: documentLines,
    });

    const deliveryNotePath = `${order.id}.pdf`;
    await uploadOrderDocument(supabase, DELIVERY_NOTES_BUCKET, deliveryNotePath, deliveryNotePdf);

    // Réutilise le numéro déjà attribué si une tentative précédente l'a
    // obtenu avant d'échouer plus loin : la séquence (03) ne doit jamais
    // laisser de trou pour un numéro jamais réellement utilisé.
    let invoiceNumber = order.invoice_number;
    if (invoiceNumber == null) {
      const { data: invoiceNumberData, error: invoiceNumberError } =
        await supabase.rpc("next_invoice_number");

      if (invoiceNumberError || invoiceNumberData == null) {
        throw new Error(
          `Attribution du numéro de facture échouée (session ${sessionId}) : ${invoiceNumberError?.message}`,
        );
      }
      invoiceNumber = Number(invoiceNumberData);
    }

    const invoicePdf = await generateInvoicePdf({
      orderId: order.id,
      createdAt: order.created_at,
      shippingAddress: order.shipping_address,
      lines: documentLines,
      invoiceNumber,
      customerEmail: order.customer_email,
    });

    const invoicePath = `${order.id}.pdf`;
    await uploadOrderDocument(supabase, INVOICES_BUCKET, invoicePath, invoicePdf);

    // Documents générés : la commande est prête pour l'ordre d'expédition
    // APF. L'envoi effectif de l'email (BL joint) reste en TODO spec 17 — ce
    // statut décrit l'état "prêt à envoyer", pas encore "email parti".
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        delivery_note_url: deliveryNotePath,
        invoice_pdf_path: invoicePath,
        invoice_number: invoiceNumber,
        status: "SENT_TO_SUPPLIER",
        processing_error: null,
      })
      .eq("id", order.id);

    if (updateError) {
      throw new Error(
        `Mise à jour commande (documents/statut) échouée (session ${sessionId}) : ${updateError.message}`,
      );
    }

    // TODO spec 17 : envoyer l'email de confirmation client (facture jointe)
    // et la notification APF/admin (BL joint, URL signée depuis
    // `delivery_note_url` — jamais l'URL persistée elle-même).
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      `[commande ${order.id}] Génération des documents (BL/facture) échouée — statut resté PAID, ` +
        `commande à rejouer (stripe events resend ${sessionId}) : ${message}`,
      error,
    );

    const { error: flagError } = await supabase
      .from("orders")
      .update({ processing_error: message })
      .eq("id", order.id);

    if (flagError) {
      console.error(
        `[commande ${order.id}] Échec de l'enregistrement de processing_error : ${flagError.message}`,
      );
    }

    // TODO spec 17 : alerter ADMIN_ALERT_EMAIL (getApfEnv(), src/lib/env)
    // — commande payée bloquée en PAID, nécessite un rejeu ou une
    // intervention manuelle.

    throw error;
  }
}

async function handleCheckoutCompleted(sessionId: string) {
  const supabase = createServiceRoleClient();

  const existingOrder = await findOrderBySession(supabase, sessionId);
  const order = existingOrder ?? (await createOrderFromSession(supabase, sessionId));

  if (order.status !== "PAID") {
    // Documents déjà générés (ou commande dans un autre état géré
    // manuellement, ex. CANCELLED) : zéro retraitement (10).
    return;
  }

  await generateAndAttachDocuments(supabase, order, sessionId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.expired") {
    console.warn(`Session Stripe expirée sans paiement : ${event.data.object.id}`);
    return NextResponse.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    await handleCheckoutCompleted(event.data.object.id);
  } catch (error) {
    console.error("Échec de traitement du webhook Stripe", error);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
