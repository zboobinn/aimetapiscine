import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const body = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});
