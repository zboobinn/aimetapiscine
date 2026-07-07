import catalogFile from "../../../data/catalog.json";
import { catalogFileSchema, type CatalogEntry } from "./schema";

/**
 * Lecture du fichier pivot `data/catalog.json` (04) côté build/serveur.
 * Import direct (pas de fetch) : disponible en SSG/ISR comme dans les scripts.
 */
const catalog = catalogFileSchema.parse(catalogFile);

const ACCESSORY_CATEGORY_SLUGS: Record<string, string> = {
  FEUTRE: "feutres",
  COLLE: "colles",
  PVC_LIQUIDE: "pvc-liquide",
  PROFIL: "profils",
  SOLVANT: "solvants",
  AUTRE: "autres",
};

const ACCESSORY_CATEGORY_LABELS: Record<string, string> = {
  FEUTRE: "Feutres de protection",
  COLLE: "Colles",
  PVC_LIQUIDE: "PVC liquide",
  PROFIL: "Profilés",
  SOLVANT: "Solvants",
  AUTRE: "Autres accessoires",
};

export function getAllProducts(): CatalogEntry[] {
  return catalog.products;
}

export function getMembranes(): CatalogEntry[] {
  return catalog.products.filter((p) => p.category === "MEMBRANE" && p.in_stock);
}

export function getGammes(): string[] {
  return Array.from(new Set(getMembranes().map((p) => p.gamme as string)));
}

export function getMembranesByGamme(gamme: string): CatalogEntry[] {
  return getMembranes().filter((p) => p.gamme === gamme);
}

export function getMembraneByGammeAndCouleur(
  gamme: string,
  couleurSlug: string,
): CatalogEntry | undefined {
  return getMembranesByGamme(gamme).find(
    (p) => couleurToSlug(p.couleur as string) === couleurSlug,
  );
}

export function couleurToSlug(couleur: string): string {
  return couleur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getAccessories(): CatalogEntry[] {
  return catalog.products.filter((p) => p.category !== "MEMBRANE" && p.in_stock);
}

export function getAccessoryCategorySlug(category: string): string {
  return ACCESSORY_CATEGORY_SLUGS[category] ?? category.toLowerCase();
}

export function getAccessoryCategoryLabel(category: string): string {
  return ACCESSORY_CATEGORY_LABELS[category] ?? category;
}

export function getAccessoryCategorySlugs(): string[] {
  return Array.from(new Set(getAccessories().map((p) => getAccessoryCategorySlug(p.category))));
}

export function getAccessoriesByCategorySlug(categorieSlug: string): CatalogEntry[] {
  return getAccessories().filter((p) => getAccessoryCategorySlug(p.category) === categorieSlug);
}

export function getAccessoryBySlug(
  categorieSlug: string,
  slug: string,
): CatalogEntry | undefined {
  return getAccessoriesByCategorySlug(categorieSlug).find((p) => p.slug === slug);
}
