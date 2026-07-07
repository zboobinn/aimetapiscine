import type { Metadata } from "next";
import { PanierClient } from "./panier-client";

export const metadata: Metadata = {
  title: "Panier | Membranes Armées",
  robots: { index: false, follow: false },
};

export default function PanierPage() {
  return <PanierClient />;
}
