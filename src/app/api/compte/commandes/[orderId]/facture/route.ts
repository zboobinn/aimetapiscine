import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiErrorCode } from "@/lib/api/errors";
import { apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createSignedDocumentUrl, INVOICES_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Téléchargement facture (11) : l'appartenance de la commande est vérifiée
 * via le client lié à la session (RLS `orders_select_own`) — le
 * `service_role` sert UNIQUEMENT à générer l'URL signée une fois la
 * propriété confirmée, jamais à contourner cette vérification.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const parsedOrderId = z.string().uuid().safeParse(orderId);
  if (!parsedOrderId.success) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, "Identifiant de commande invalide.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError(ApiErrorCode.UNAUTHENTICATED, "Connectez-vous pour accéder à ce document.");
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("invoice_pdf_path")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order || !order.invoice_pdf_path) {
    return apiError(ApiErrorCode.NOT_FOUND, "Document introuvable.");
  }

  const signedUrl = await createSignedDocumentUrl(
    createServiceRoleClient(),
    INVOICES_BUCKET,
    order.invoice_pdf_path,
  );

  return NextResponse.redirect(signedUrl);
}
