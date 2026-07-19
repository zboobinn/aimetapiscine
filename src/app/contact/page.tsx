import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | ArmaPool",
  description: "Contacter ArmaPool.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">Contact</h1>
      <p className="mt-6 text-ink-muted">Contenu à venir.</p>
    </div>
  );
}
