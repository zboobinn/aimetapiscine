export interface NavLink {
  href: string;
  label: string;
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Accueil" },
  { href: "/membrane-armee", label: "Membrane armée" },
  { href: "/accessoires", label: "Accessoires" },
  { href: "/calculateur", label: "Calculateur" },
  { href: "/guides", label: "Guides" },
];
