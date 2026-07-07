import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
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
  title: "Membranes Armées — APF Pool Design",
  description:
    "Membranes armées piscine et accessoires de pose en dropshipping direct APF Pool Design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-body text-ink">
        {children}
      </body>
    </html>
  );
}
