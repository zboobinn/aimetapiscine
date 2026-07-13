import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PoolImage } from "@/components/media/pool-image";
import { CollapsibleSection, SpecTable, StickyBuyBox, SwatchGroup } from "@/components/nuancier";
import type { SpecRow } from "@/components/nuancier";
import { getCompatibleAccessories } from "@/features/cart";
import {
  calculatePack,
  DEFAULT_CALCULATOR_INPUT,
  DEFAULT_POOL_DIMENSIONS,
  defaultCalculatorConfig,
} from "@/features/calculator";
import { computePdpBuyBoxAmounts } from "@/features/pdp/buy-box-pricing";
import {
  couleurToSlug,
  getAccessories,
  getMembraneByGammeAndCouleur,
  getMembranes,
  getMembranesByGamme,
} from "@/lib/catalog/data";
import { withLivePricing, withLivePricingOne } from "@/lib/catalog/live-pricing";
import { toCartProductSummary } from "@/lib/cart/product-summary";
import { getBusinessConfigEnv } from "@/lib/env";
import { resolvePoolMedia, type PoolMediaPlan } from "@/lib/media/pool-media";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/get-shipping-fee";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildProductJsonLd } from "@/lib/seo/product-jsonld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";
import { capitalize } from "@/lib/utils/text";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ gamme: string; couleur: string }>;
}

const GALLERY_PLANS: PoolMediaPlan[] = ["macro", "bassin", "echelle", "soudure"];

/**
 * Pastille de couleur des swatches (29) : le catalogue ne porte qu'un nom de
 * coloris (`couleur`), pas de valeur hex — mappage manuel, à étendre à
 * chaque nouveau coloris catalogue. Jamais `--turquoise` ici pour un coloris
 * qui n'est pas réellement turquoise (D1, la couleur du produit).
 */
const SWATCH_COLOR_BY_COULEUR: Record<string, string> = {
  bleu: "#0E5C8A",
  "gris anthracite": "#3A3D3F",
  nuage: "#D8D9D5",
};

function swatchColorFor(couleur: string): string {
  return SWATCH_COLOR_BY_COULEUR[couleur.toLowerCase()] ?? "#B6B3AA";
}

const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

// Highlights (29) : copie éditoriale PROVISOIRE — OK pour cette passe
// (structure + prix), à remplacer avant publication réelle. Images tirées du
// manifeste médias (couture 29.0) en rotation, faute d'une image dédiée par
// highlight (bloqué sur assets photo, docs/annexe-brief-photo.md).
const HIGHLIGHTS: { title: string; body: string; plan: PoolMediaPlan }[] = [
  {
    title: "Armature",
    body: "Armature tissée haute résistance, conçue pour encaisser les variations thermiques et la pression de l'eau sans se déformer. (copie provisoire — OK)",
    plan: "macro",
  },
  {
    title: "Vernis",
    body: "Vernis de finition anti-UV et anti-algues, pensé pour une eau claire toute la saison sans entretien lourd. (copie provisoire — OK)",
    plan: "bassin",
  },
  {
    title: "Épaisseur",
    body: "1,5 mm d'épaisseur constante sur toute la surface — la membrane armée qui tient la distance face aux chocs de chantier. (copie provisoire — OK)",
    plan: "echelle",
  },
  {
    title: "Pose",
    body: "Lés soudés à chaud, sans colle sur les joints structurels — une pose fiable pour un rendu étanche dans la durée. (copie provisoire — OK)",
    plan: "soudure",
  },
  {
    title: "Garantie",
    body: "10 ans de garantie fabricant sur la membrane posée dans les règles de l'art. (copie provisoire — OK)",
    plan: "macro",
  },
];

export function generateStaticParams() {
  return getMembranes().map((produit) => ({
    gamme: produit.gamme as string,
    couleur: couleurToSlug(produit.couleur as string),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gamme, couleur } = await params;
  const produit = getMembraneByGammeAndCouleur(gamme, couleur);

  if (!produit) {
    return { title: "Produit introuvable | Membranes Armées" };
  }

  return {
    title: `${produit.name} | Membranes Armées`,
    description: produit.description,
    alternates: { canonical: `/membrane-armee/${gamme}/${couleur}` },
  };
}

export default async function MembraneFichePage({ params }: PageProps) {
  const { gamme, couleur } = await params;
  const produitCatalogue = getMembraneByGammeAndCouleur(gamme, couleur);

  if (!produitCatalogue) {
    notFound();
  }

  const produit = await withLivePricingOne(produitCatalogue);
  const compatibleAccessories = await withLivePricing(getCompatibleAccessories(getAccessories()));
  const canonicalUrl = absoluteUrl(`/membrane-armee/${gamme}/${couleur}`);
  const publicTtcCents = computePublicTtcCents(produit.base_price_ht, produit.vat_rate);

  const media = resolvePoolMedia(couleur);

  // Prix serveur sur les cotes par défaut (D5) : le calculateur inline (29b)
  // n'est pas dans le périmètre de cette passe — le moteur (08) est appelé
  // tel quel, sur `DEFAULT_CALCULATOR_INPUT`, jamais réécrit.
  const { LOSS_COEFF_BASE, LOSS_COEFF_STAIRS } = getBusinessConfigEnv();
  const calculatorConfig = defaultCalculatorConfig({
    lossCoeffBase: LOSS_COEFF_BASE,
    lossCoeffStairs: LOSS_COEFF_STAIRS,
  });
  const { surface, membrane } = calculatePack({
    input: DEFAULT_CALCULATOR_INPUT,
    config: calculatorConfig,
    membraneRollAreaM2: produit.roll_area_m2 as number,
    accessoryProducts: [],
  });

  // Rôle tarifaire figé à "b2c" (comme `PriceBlock`, 28b) : résoudre le rôle
  // pro exigerait de lire la session ici et rendrait la route dynamique,
  // cassant l'ISR (decision 2026-07-08, `resolvePricingRole` dans
  // `RootLayout` explicitement écarté pour la même raison). Hydratation du
  // prix pro sur cette buy-box : hors périmètre de cette passe, cf.
  // docs/decisions.md.
  const buyBox = await computePdpBuyBoxAmounts(produit, "b2c", membrane.quantity, surface.grossM2);

  const siblings = getMembranesByGamme(gamme);
  const swatchOptions = siblings.map((sibling) => {
    const siblingCouleur = sibling.couleur as string;
    const siblingSlug = couleurToSlug(siblingCouleur);
    const siblingMedia = resolvePoolMedia(siblingSlug);

    return {
      id: siblingSlug,
      name: capitalize(siblingCouleur),
      color: swatchColorFor(siblingCouleur),
      image: { src: siblingMedia.plans.bassin.src, alt: siblingMedia.plans.bassin.alt },
    };
  });

  const specRows: SpecRow[] = [
    { label: "Référence", value: produit.slug },
    { label: "Gamme", value: capitalize(gamme) },
    { label: "Coloris", value: capitalize(produit.couleur as string) },
    { label: "Surface au rouleau", value: `${produit.roll_area_m2} m²` },
    { label: "Poids au rouleau", value: `${((produit.weight_grams as number) / 1000).toFixed(1)} kg` },
    { label: "Conditionnement", value: produit.unit },
    { label: "Épaisseur", value: "1,5 mm (à confirmer)" },
    { label: "Garantie", value: "10 ans (à confirmer)" },
  ];

  return (
    <div
      className="mx-auto w-full px-4 py-12 sm:px-6"
      style={{ maxWidth: "var(--page-max)", color: "var(--ink)" }}
    >
      <JsonLd
        data={buildProductJsonLd({
          produit,
          canonicalUrl,
          publicTtcCents,
          revalidateSeconds: revalidate,
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Accueil", url: "/" },
          { name: "Membrane armée", url: "/membrane-armee" },
          { name: capitalize(gamme), url: `/membrane-armee/${gamme}` },
          { name: capitalize(produit.couleur as string), url: `/membrane-armee/${gamme}/${couleur}` },
        ])}
      />

      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/membrane-armee", label: "Membrane armée" },
            { href: `/membrane-armee/${gamme}`, label: capitalize(gamme) },
            { href: `/membrane-armee/${gamme}/${couleur}`, label: capitalize(produit.couleur as string) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Colonne gauche : galerie — toutes les vignettes visibles (29). */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-[var(--header-h)] lg:self-start">
          <div
            className="relative w-full overflow-hidden border"
            style={{
              aspectRatio: "4 / 3",
              borderColor: "var(--coping)",
              borderRadius: "var(--radius)",
              background: "var(--lime-wash)",
            }}
          >
            <PoolImage
              colorisSlug={couleur}
              plan="bassin"
              priority
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {GALLERY_PLANS.map((plan) => (
              <div
                key={plan}
                className="relative overflow-hidden border"
                style={{
                  aspectRatio: "4 / 3",
                  borderColor: "var(--coping)",
                  borderRadius: "var(--radius)",
                  background: "var(--lime-wash)",
                }}
              >
                <PoolImage colorisSlug={couleur} plan={plan} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite : buy-box sticky (29, D5/D6). */}
        <div className="flex flex-col gap-6">
          <StickyBuyBox>
            <div className="flex flex-col gap-4">
              {/* Titre compact (29, correctif « prix visible sans scroll ») : la
                  description longue est reléguée sous le bloc prix/ATC, pas
                  avant — elle n'est pas nécessaire pour décider d'acheter. */}
              <div className="flex items-center gap-3">
                <span
                  className="w-fit shrink-0 border px-2 py-0.5 font-mono text-[var(--step--1)]"
                  style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", color: "var(--ink-60)" }}
                >
                  {produit.in_stock ? "En stock" : "Indisponible"}
                </span>
                <h1 className="font-display" style={{ fontSize: "var(--step-1)" }}>
                  {produit.name}
                </h1>
              </div>

              {/* Swatches réduits (correctif) : l'aperçu photo de `SwatchGroup`
                  (28b, primitive non modifiée) est contraint en largeur pour ne
                  pas repousser le bloc prix sous la ligne de flottaison — la
                  galerie de gauche porte déjà l'image principale en grand. */}
              <div className="flex flex-col gap-2">
                <div style={{ maxWidth: "9rem" }}>
                  <SwatchGroup label="Coloris de la membrane" options={swatchOptions} defaultSelectedId={couleur} />
                </div>
                <p className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                  {media.waterAppearance}
                </p>
              </div>

              <dl className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--coping)" }}>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                    Surface calculée
                  </dt>
                  <dd className="font-mono tabular-nums text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                    {surface.grossM2.toFixed(1)} m²
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <dt style={{ color: "var(--ink-60)" }}>Prix au m²</dt>
                  <dd className="font-mono tabular-nums">
                    {buyBox.pricePerM2Cents !== null ? `${formatCents(buyBox.pricePerM2Cents)} / m²` : "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt style={{ color: "var(--ink-60)" }}>
                    Membrane ({membrane.quantity} rouleau{membrane.quantity > 1 ? "x" : ""})
                  </dt>
                  <dd className="font-mono tabular-nums">{formatCents(buyBox.membraneSubtotalCents)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt style={{ color: "var(--ink-60)" }}>Livraison</dt>
                  <dd className="font-mono tabular-nums">
                    {buyBox.shippingCents > 0 ? `+${formatCents(buyBox.shippingCents)}` : "Incluse"}
                  </dd>
                </div>
                <div
                  className="flex items-baseline justify-between gap-4 border-t pt-3"
                  style={{ borderColor: "var(--coping)" }}
                >
                  <dt style={{ fontSize: "var(--step-0)" }}>Total estimé</dt>
                  <dd className="font-mono tabular-nums" style={{ fontSize: "var(--step-1)" }}>
                    {formatCents(buyBox.totalCents)}
                  </dd>
                </div>
              </dl>

              <AddToCartButton
                product={toCartProductSummary(produit, publicTtcCents)}
                quantity={membrane.quantity}
                compatibleAccessories={compatibleAccessories.map((accessory) =>
                  toCartProductSummary(
                    accessory,
                    computePublicTtcCents(accessory.base_price_ht, accessory.vat_rate),
                  ),
                )}
              />

              <p className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                Sur des cotes standard {DEFAULT_POOL_DIMENSIONS.length.toFixed(2)} ×{" "}
                {DEFAULT_POOL_DIMENSIONS.width.toFixed(2)} × {DEFAULT_POOL_DIMENSIONS.depth.toFixed(2)} m —{" "}
                <Link href="/calculateur" className="underline" style={{ color: "var(--deep-blue)" }}>
                  affinez avec vos cotes
                </Link>
                .
              </p>

              {produit.description ? (
                <p style={{ color: "var(--ink-60)" }}>{produit.description}</p>
              ) : null}

              <ul className="flex flex-col gap-1.5 text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                <li>✓ Garantie 10 ans</li>
                <li>
                  ✓ Découpe sur mesure —{" "}
                  <Link href="/livraison-retours" className="underline" style={{ color: "var(--deep-blue)" }}>
                    conditions de retour
                  </Link>
                </li>
                <li>✓ {SHIPPING_DELAY_LABEL}</li>
              </ul>
            </div>
          </StickyBuyBox>
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-10">
        {HIGHLIGHTS.map((highlight) => (
          <div key={highlight.title} className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
            <div
              className="relative overflow-hidden border"
              style={{
                aspectRatio: "4 / 3",
                borderColor: "var(--coping)",
                borderRadius: "var(--radius)",
                background: "var(--lime-wash)",
              }}
            >
              <PoolImage colorisSlug={couleur} plan={highlight.plan} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <h2 className="font-display" style={{ fontSize: "var(--step-1)" }}>
                {highlight.title}
              </h2>
              <p style={{ color: "var(--ink)", lineHeight: "var(--lh-body)" }}>{highlight.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <CollapsibleSection title="Fiche technique" name="pdp" defaultOpen>
          <SpecTable rows={specRows} caption="Fiche technique" />
        </CollapsibleSection>
        <CollapsibleSection title="Pose" name="pdp">
          <p>
            Lés soudés à chaud sur place par un professionnel, fixation sur margelle ou rail de finition
            selon le chantier. Un profilé de finition et une soudure PVC liquide sont recommandés en
            complément. (copie provisoire — OK)
          </p>
        </CollapsibleSection>
        <CollapsibleSection title="Entretien" name="pdp">
          <p>
            Un brossage régulier et un équilibrage de l&apos;eau suffisent à préserver l&apos;aspect et la
            durée de vie de la membrane. Aucun produit abrasif. (copie provisoire — OK)
          </p>
        </CollapsibleSection>
        <CollapsibleSection title="Questions fréquentes" name="pdp">
          <p>
            Contenu FAQ à venir (spec 20/31). (copie provisoire — OK)
          </p>
        </CollapsibleSection>
      </div>
    </div>
  );
}
