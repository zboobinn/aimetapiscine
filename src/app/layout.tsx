import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSiteEnv } from "@/lib/env";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildOrganizationJsonLd } from "@/lib/seo/structured-data";
import { display, body as nuancierBody, mono } from "./fonts";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteEnv().NEXT_PUBLIC_SITE_URL),
  // Correctif (30, rappel CLAUDE.md) : "Vente directe fabricant" impliquait à
  // tort une fabrication propre — nous sommes distributeur, jamais fabricant.
  title: "ArmaPool — Membranes armées sur mesure",
  description:
    "Membranes armées piscine et accessoires de pose, livrés en France métropolitaine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${inter.variable} ${display.variable} ${nuancierBody.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-body text-ink">
        {/* Organization (30, SEO machine) : site-wide, jamais seulement sur `/` —
            builder gardé de la spec 27 (SITE_BRAND, pas d'argument). */}
        <JsonLd data={buildOrganizationJsonLd()} />
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
