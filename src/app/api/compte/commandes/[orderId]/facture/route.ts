import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createSignedDocumentUrl, INVOICES_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("invoice_pdf_path")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order || !order.invoice_pdf_path) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const signedUrl = await createSignedDocumentUrl(
    createServiceRoleClient(),
    INVOICES_BUCKET,
    order.invoice_pdf_path,
  );

  return NextResponse.redirect(signedUrl);
}
