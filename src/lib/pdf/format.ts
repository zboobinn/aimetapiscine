import type { OrderShippingAddress } from "./types";

const moneyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

// `Intl.NumberFormat("fr-FR")` sépare les milliers avec une espace fine
// insécable (U+202F) et espace avant l'unité avec une espace insécable
// (U+00A0) : notre police PDF embarquée (PT Sans, register-fonts.ts) n'a
// pas ces glyphes et les affiche en carré de remplacement. On les
// remplace par une espace normale au moment du rendu PDF uniquement, sans
// changer le format "4 575,00 €" affiché ni le formatage utilisé côté web
// (components/ui/price.tsx, qui a la police système et n'a pas ce souci).
const NON_BREAKING_SPACES = /[  ]/g;

export function formatCents(cents: number): string {
  return moneyFormatter.format(cents / 100).replace(NON_BREAKING_SPACES, " ");
}

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso));
}

export function formatShippingAddress(shipping: OrderShippingAddress): string[] {
  const lines: string[] = [];
  if (shipping.name) lines.push(shipping.name);

  const address = shipping.address;
  if (address) {
    if (address.line1) lines.push(address.line1);
    if (address.line2) lines.push(address.line2);
    const cityLine = [address.postal_code, address.city].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    if (address.country) lines.push(address.country);
  }

  return lines.length > 0 ? lines : ["Adresse non renseignée"];
}
