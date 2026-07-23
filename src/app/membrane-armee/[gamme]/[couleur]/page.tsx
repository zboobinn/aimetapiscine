import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollapsibleSection, SpecTable, StickyBuyBox, SwatchGroup } from "@/components/nuancier";
import type { SpecRow } from "@/components/nuancier";
import { getCompatibleAccessories } from "@/features/cart";
import {
  calculatePack,
  DEFAULT_CALCULATOR_INPUT,
  defaultCalculatorConfig,
} from "@/features/calculator";
import { computePdpBuyBoxAmounts } from "@/features/pdp/buy-box-pricing";
import { PdpBuyBox } from "@/features/pdp/pdp-buy-box";
import { PdpChecklistUpsell } from "@/features/pdp/pdp-checklist-upsell";
import { PdpProvider } from "@/features/pdp/pdp-context";
import { couleurToSlug, getAccessories } from "@/lib/catalog/data";
import {
  FALLBACK_CATALOG_IMAGE,
  formatColorisLabel,
  getLiveMembraneProductBySlug,
  getLiveMembraneProducts,
  pickPdpVariant,
  toCatalogEntry,
} from "@/lib/catalog/live-catalog";
import { swatchColorFor } from "@/lib/catalog/swatch-color";
import { toCartProductSummary } from "@/lib/cart/product-summary";
import { getBusinessConfigEnv } from "@/lib/env";
import { resolvePoolMedia, type PoolMediaEntry } from "@/lib/media/pool-media";
import { computePublicTtcCents } from "@/lib/pricing/vat";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildProductJsonLd } from "@/lib/seo/product-jsonld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ gamme: string; couleur: string }>;
}

// Highlights (29) : copie éditoriale PROVISOIRE — OK pour cette passe
// (structure + prix), à remplacer avant publication réelle.
const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: "Armature",
    body: "Armature tissée haute résistance, conçue pour encaisser les variations thermiques et la pression de l'eau sans se déformer. (copie provisoire — OK)",
  },
  {
    title: "Vernis",
    body: "Vernis de finition anti-UV et anti-algues, pensé pour une eau claire toute la saison sans entretien lourd. (copie provisoire — OK)",
  },
  {
    title: "Épaisseur",
    body: "Épaisseur constante sur toute la surface — la membrane armée qui tient la distance face aux chocs de chantier. (copie provisoire — OK)",
  },
  {
    title: "Pose",
    body: "Lés soudés à chaud, sans colle sur les joints structurels — une pose fiable pour un rendu étanche dans la durée. (copie provisoire — OK)",
  },
  {
    title: "Garantie",
    body: "10 ans de garantie fabricant sur la membrane posée dans les règles de l'art. (copie provisoire — OK)",
  },
];

/**
 * Le manifeste photo (`resolvePoolMedia`, annexe-brief-photo) ne connaît que
 * les 3 coloris du fixture de test `data/catalog.json` — il throw pour tout
 * autre coloris. Le catalogue réel (`data/apf/catalog-facade.json`, 239
 * variantes) est très majoritairement hors de ce manifeste tant que le
 * shooting réel n'a pas eu lieu (bloqué sur assets photo, docs/29-page-
 * produit.md). Ce repli reste local à cette page (ne modifie pas
 * `pool-media.ts`) : un coloris inconnu du manifeste affiche un visuel
 * générique plutôt que de faire planter la fiche produit.
 */
function safePoolMedia(colorisSlug: string): PoolMediaEntry | null {
  try {
    return resolvePoolMedia(colorisSlug);
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const gammes = await getLiveMembraneProducts();
  return gammes.flatMap((gamme) =>
    gamme.variants
      .filter((variant) => variant.coloris !== null)
      .map((variant) => ({
        gamme: gamme.slug,
        couleur: couleurToSlug(variant.coloris as string),
      })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gamme, couleur } = await params;
  const produit = await getLiveMembraneProductBySlug(gamme);
  const variant = produit ? pickPdpVariant(produit, couleur) : undefined;

  if (!produit || !variant) {
    return { title: "Produit introuvable | ArmaPool" };
  }

  const name = variant.coloris ? `${produit.name} — ${formatColorisLabel(variant.coloris)}` : produit.name;

  return {
    title: `${name} | ArmaPool`,
    description: produit.description ?? undefined,
    alternates: { canonical: `/membrane-armee/${gamme}/${couleur}` },
  };
}

export default async function MembraneFichePage({ params }: PageProps) {
  const { gamme, couleur } = await params;
  const produitLive = await getLiveMembraneProductBySlug(gamme);
  const variant = produitLive ? pickPdpVariant(produitLive, couleur) : undefined;

  if (!produitLive || !variant) {
    notFound();
  }

  const produit = toCatalogEntry(produitLive, variant, { gammeSlug: gamme, couleurSlug: couleur });
  const compatibleAccessories = getCompatibleAccessories(getAccessories());
  const canonicalUrl = absoluteUrl(`/membrane-armee/${gamme}/${couleur}`);
  const publicTtcCents = computePublicTtcCents(produit.base_price_ht, produit.vat_rate);

  const media = safePoolMedia(couleur);
  const displayName = variant.coloris
    ? `${produitLive.name} — ${formatColorisLabel(variant.coloris)}`
    : produitLive.name;

  // Prix serveur sur les cotes par défaut (D5) : état initial du calculateur
  // inline (29b), rendu SSR pour le SEO — le moteur (08) est appelé tel
  // quel, sur `DEFAULT_CALCULATOR_INPUT`, jamais réécrit.
  const { LOSS_COEFF_BASE, LOSS_COEFF_STAIRS, PACK_DISCOUNT_BPS } = getBusinessConfigEnv();
  const calculatorConfig = defaultCalculatorConfig({
    lossCoeffBase: LOSS_COEFF_BASE,
    lossCoeffStairs: LOSS_COEFF_STAIRS,
  });
  // `accessoryProducts` alimente `result.accessories` (08) — nécessaire à la
  // checklist de chantier (29c②), sans impact sur `surface`/`membrane` (le
  // calcul de surface/rouleaux ne dépend jamais des accessoires).
  const { surface, membrane, accessories: packAccessoryItems } = calculatePack({
    input: DEFAULT_CALCULATOR_INPUT,
    config: calculatorConfig,
    membraneRollAreaM2: produit.roll_area_m2 as number,
    accessoryProducts: compatibleAccessories,
  });

  // Liste client-safe (23a, jamais de `sku`) des accessoires proposés par la
  // checklist de chantier (29c②), quantités calculées sur les cotes par
  // défaut — comme le reste de la buy-box initiale (29a). Le prix HT/TVA de
  // chaque accessoire est nécessaire côté client pour que la checklist et le
  // panier facturent au centime près via la MÊME `computeLineChargeFromUnitHt`.
  const checklistAccessories = packAccessoryItems.map((item) => {
    const catalogEntry = compatibleAccessories.find((accessory) => accessory.slug === item.slug);
    if (!catalogEntry) {
      throw new Error(`Accessoire de checklist introuvable dans le catalogue : ${item.slug}`);
    }
    return {
      slug: item.slug,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      motif: item.motif,
      unitHtCents: catalogEntry.base_price_ht,
      vatRateBps: catalogEntry.vat_rate,
    };
  });

  // Rôle tarifaire figé à "b2c" (comme `PriceBlock`, 28b) : résoudre le rôle
  // pro exigerait de lire la session ici et rendrait la route dynamique,
  // cassant l'ISR (decision 2026-07-08, `resolvePricingRole` dans
  // `RootLayout` explicitement écarté pour la même raison). Hydratation du
  // prix pro sur cette buy-box : hors périmètre de cette passe, cf.
  // docs/decisions.md.
  const buyBox = await computePdpBuyBoxAmounts(produit, "b2c", membrane.quantity, surface.grossM2);

  const swatchOptions = produitLive.variants
    .filter((sibling) => sibling.coloris !== null)
    .map((sibling) => {
      const siblingCouleur = sibling.coloris as string;
      const siblingSlug = couleurToSlug(siblingCouleur);
      const siblingMedia = safePoolMedia(siblingSlug);

      return {
        id: siblingSlug,
        name: formatColorisLabel(siblingCouleur),
        color: swatchColorFor(siblingCouleur),
        image: siblingMedia
          ? { src: siblingMedia.plans.bassin.src, alt: siblingMedia.plans.bassin.alt }
          : { src: FALLBACK_CATALOG_IMAGE, alt: formatColorisLabel(siblingCouleur) },
      };
    });

  const specRows: SpecRow[] = [
    { label: "Référence", value: produit.slug },
    { label: "Gamme", value: produitLive.name },
    ...(variant.coloris ? [{ label: "Coloris", value: formatColorisLabel(variant.coloris) }] : []),
    ...(produit.roll_area_m2 ? [{ label: "Surface au rouleau", value: `${produit.roll_area_m2} m²` }] : []),
    { label: "Poids au rouleau", value: `${((produit.weight_grams as number) / 1000).toFixed(1)} kg` },
    { label: "Conditionnement", value: produit.unit },
  ];

  return (
    <div
      className="pdp-page-padding mx-auto w-full px-4 pt-12 sm:px-6"
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
          { name: produitLive.name, url: `/membrane-armee/${gamme}` },
          { name: displayName, url: `/membrane-armee/${gamme}/${couleur}` },
        ])}
      />

      {/*
        Correctif hydratation (29c②) : `PdpProvider` (Client Component) porte
        l'état unique du calculateur + de la checklist de chantier, partagé
        par `PdpBuyBox` (haut, dans la buy-box sticky) ET `PdpChecklistUpsell`
        (bas de page, après la fiche technique/FAQ) — plus de `createPortal`.
        `children` (fil d'Ariane, galerie, highlights, `CollapsibleSection`)
        reste du contenu SERVEUR : ces éléments sont rendus par ce Server
        Component AVANT d'être passés en `children`, jamais réexécutés côté
        client — le SSR de la fiche technique/FAQ (§7) n'est pas sacrifié.
      */}
      <PdpProvider
        product={toCartProductSummary(produit, publicTtcCents)}
        calculatorConfig={calculatorConfig}
        unitHtCents={produit.base_price_ht}
        vatRateBps={produit.vat_rate}
        membraneRollAreaM2={produit.roll_area_m2 as number}
        initialInput={DEFAULT_CALCULATOR_INPUT}
        initialResult={{ surface, membrane, buyBox }}
        checklistAccessories={checklistAccessories}
        packDiscountBps={PACK_DISCOUNT_BPS}
      >
      <div className="pb-6">
        <Breadcrumbs
          items={[
            { href: "/membrane-armee", label: "Membrane armée" },
            { href: `/membrane-armee/${gamme}`, label: produitLive.name },
            { href: `/membrane-armee/${gamme}/${couleur}`, label: displayName },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Colonne gauche : galerie — visuel générique tant que le shooting
            réel n'a pas eu lieu pour ce coloris (bloqué sur assets photo). */}
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
            <Image
              src={media?.plans.bassin.src ?? FALLBACK_CATALOG_IMAGE}
              alt={media?.plans.bassin.alt ?? displayName}
              fill
              priority
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
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
                  {displayName}
                </h1>
              </div>

              {/* Swatches réduits (correctif) : l'aperçu photo de `SwatchGroup`
                  (28b, primitive non modifiée) est contraint en largeur pour ne
                  pas repousser le bloc prix sous la ligne de flottaison — la
                  galerie de gauche porte déjà l'image principale en grand. */}
              {swatchOptions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div style={{ maxWidth: "9rem" }}>
                    <SwatchGroup label="Coloris de la membrane" options={swatchOptions} defaultSelectedId={couleur} />
                  </div>
                  {media?.waterAppearance ? (
                    <p className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                      {media.waterAppearance}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <PdpBuyBox
                compatibleAccessories={compatibleAccessories.map((accessory) =>
                  toCartProductSummary(
                    accessory,
                    computePublicTtcCents(accessory.base_price_ht, accessory.vat_rate),
                  ),
                )}
                swatchOptions={swatchOptions}
                selectedCouleurSlug={couleur}
              />

              {produit.description ? (
                <p style={{ color: "var(--ink-60)" }}>{produit.description}</p>
              ) : null}
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
              <Image
                src={FALLBACK_CATALOG_IMAGE}
                alt={`${highlight.title} — visuel à venir`}
                fill
                className="h-full w-full object-cover"
              />
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

      {/*
        Checklist de chantier (29 §9, 29c②) — jamais dans la buy-box,
        toujours en bas de page. Rendue directement ici (Correctif
        hydratation 29c②, plus de portail) : `PdpChecklistUpsell` lit le
        MÊME état que `PdpBuyBox` via `usePdpContext()` (`PdpProvider`
        ci-dessus) — un seul état, une seule chaîne de prix
        (`computeChecklistPackAmounts`), jamais de calculateur dupliqué.
      */}
      <PdpChecklistUpsell />
    </PdpProvider>
    </div>
  );
}
