import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mon compte | Membranes Armées",
  robots: { index: false, follow: false },
};

type OrderStatus = "PAID" | "SENT_TO_SUPPLIER" | "SHIPPED" | "CANCELLED";

interface OrderRow {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_amount_ht: number;
  total_vat: number;
  shipping_fee: number;
  invoice_number: number | null;
  invoice_pdf_path: string | null;
}

// Formulation blind shipping (01/11) : jamais de mention APF côté client.
const STATUS_LABELS: Record<OrderStatus, string> = {
  PAID: "Paiement confirmé",
  SENT_TO_SUPPLIER: "En préparation chez notre partenaire logistique",
  SHIPPED: "Expédiée",
  CANCELLED: "Annulée",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const moneyFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatOrderTotal(order: OrderRow): string {
  const totalCents = order.total_amount_ht + order.total_vat + order.shipping_fee;
  return moneyFormatter.format(totalCents / 100);
}

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = user
    ? await supabase
        .from("orders")
        .select(
          "id, created_at, status, total_amount_ht, total_vat, shipping_fee, invoice_number, invoice_pdf_path",
        )
        .order("created_at", { ascending: false })
        .returns<OrderRow[]>()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="font-heading text-3xl font-semibold text-ink">
          Mon compte
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Vos commandes et vos factures.
        </p>
      </header>

      {!user ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6 text-sm text-ink-muted">
          <p>Connectez-vous pour consulter vos commandes et télécharger vos factures.</p>
          <Link
            href="/connexion"
            className="self-start rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold text-ink">Commandes</h2>
          {!orders || orders.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune commande pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink">
                      Commande du {dateFormatter.format(new Date(order.created_at))}
                    </span>
                    <span className="text-sm text-ink-muted">{STATUS_LABELS[order.status]}</span>
                    <span className="text-sm text-ink-muted">{formatOrderTotal(order)}</span>
                  </div>
                  {order.invoice_pdf_path ? (
                    <a
                      href={`/api/compte/commandes/${order.id}/facture`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Télécharger la facture
                    </a>
                  ) : (
                    <span className="text-sm text-ink-muted">Facture en cours de génération</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-10 text-sm text-ink-muted">
        Compte professionnel ?{" "}
        <Link href="/compte/pro" className="font-medium text-accent hover:underline">
          Inscription / statut pro
        </Link>
      </p>
    </div>
  );
}
