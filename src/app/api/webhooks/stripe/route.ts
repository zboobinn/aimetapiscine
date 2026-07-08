import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeWebhookEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Webhook Stripe (10) : point pivot de l'encaissement, doit rester fiable
 * même en cas de retraitement. Body brut lu AVANT tout parsing (signature
 * vérifiée dessus, 23), idempotence par `stripe_session_id` (03), réponse
 * 200 rapide — toute erreur interne est renvoyée en 500 pour laisser
 * Stripe retenter (jamais avalée, 10/23).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

async function handleCheckoutCompleted(sessionId: string) {
  const supabase = createServiceRoleClient();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existingOrder) {
    // Événement déjà traité (redélivrance Stripe) : zéro retraitement (10).
    return;
  }

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
    .select("id")
    .single();

  if (orderError) {
    if (orderError.code === UNIQUE_VIOLATION) {
      // Course concurrente entre deux livraisons du même événement : l'autre
      // a déjà créé la commande, rien à faire ici.
      return;
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

  // TODO spec 11 : générer le BL PDF (bucket `delivery-notes/`), attribuer
  // `invoice_number` (séquence DB) et passer la commande en SENT_TO_SUPPLIER
  // après envoi de l'ordre d'expédition à APF.
  // TODO spec 17 : envoyer l'email de confirmation client (facture jointe)
  // et la notification APF/admin.
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
