import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CatalogEntry } from "@/lib/catalog/schema";
import {
  Bleed,
  CollapsibleSection,
  PriceBlock,
  SpecTable,
  StickyBuyBox,
  SwatchGroup,
} from "@/components/nuancier";
import { PoolImage } from "@/components/media/pool-image";
import { poolMediaPlanSchema, resolvePoolMedia } from "@/lib/media/pool-media";

// Piège connu (28, docs/28-design-system-nuancier.md) : ce flag DOIT rester une
// expression littérale `process.env.NEXT_PUBLIC_DESIGN_ROUTE_ENABLED === 'true'`
// — jamais via Zod ni un accesseur (`lib/env`), sous peine de casser
// l'inlining Next.js et de laisser la route accessible en prod. Défaut :
// désactivée (toute valeur autre que la chaîne littérale "true" => 404).
const DESIGN_ROUTE_ENABLED = process.env.NEXT_PUBLIC_DESIGN_ROUTE_ENABLED === "true";

export const metadata: Metadata = {
  title: "Nuancier — fondations | Membranes Armées",
  robots: { index: false, follow: false },
};

const colorTokens = [
  { name: "--ink", value: "#101314", role: "encre — texte, bordures fortes" },
  { name: "--lime-wash", value: "#F2F3EF", role: "blanc de chaux — fond de page" },
  { name: "--turquoise", value: "#3FB6A8", role: "couleur de l'eau — jamais un accent d'UI" },
  { name: "--deep-blue", value: "#0E5C8A", role: "liens, focus" },
  { name: "--coping", value: "#B6B3AA", role: "gris margelle — texte secondaire, filets" },
  { name: "--signal", value: "#E8452B", role: "erreurs uniquement" },
  { name: "--surface", value: "#FFFFFF", role: "cartes, buy-box" },
];

// Donnée bidon (28b) : jamais de SKU/nom fournisseur réel sur cette route
// (27). `pro_price_ht` existe dans le type CatalogEntry mais PriceBlock est
// appelé ici en role="b2c" (défaut) : il n'est jamais lu ni affiché.
const demoProduct: CatalogEntry = {
  sku: "demo-membrane-nuancier",
  slug: "demo-membrane-nuancier",
  name: "Membrane armée — coloris démo",
  category: "MEMBRANE",
  gamme: "Uni",
  couleur: "Turquoise démo",
  description: "Donnée bidon pour la galerie de primitives /_design.",
  base_price_ht: 245000,
  pro_price_ht: null,
  vat_rate: 2000,
  weight_grams: 42000,
  roll_area_m2: 41.25,
  unit: "rouleau",
  coverage: null,
  image: "/nuancier/placeholder-1.svg",
  in_stock: true,
};

const swatchOptions = [
  {
    id: "turquoise-demo",
    name: "Turquoise démo",
    color: "#3FB6A8",
    image: { src: "/nuancier/placeholder-1.svg", alt: "Bassin — coloris turquoise démo" },
  },
  {
    id: "bleu-demo",
    name: "Bleu profond démo",
    color: "#0E5C8A",
    image: { src: "/nuancier/placeholder-2.svg", alt: "Bassin — coloris bleu profond démo" },
  },
  {
    id: "gris-demo",
    name: "Gris margelle démo",
    color: "#B6B3AA",
    image: { src: "/nuancier/placeholder-3.svg", alt: "Bassin — coloris gris margelle démo" },
  },
];

const specRows = [
  { label: "Épaisseur", value: "1,5 mm" },
  { label: "Largeur de lé", value: "1,65 m" },
  { label: "Surface au rouleau", value: "41,25 m²" },
  { label: "Garantie", value: "10 ans" },
];

const typeScale = [
  { token: "--step--1", label: "step -1" },
  { token: "--step-0", label: "step 0 — corps 17px" },
  { token: "--step-1", label: "step 1" },
  { token: "--step-2", label: "step 2" },
  { token: "--step-3", label: "step 3" },
  { token: "--step-4", label: "step 4 — H1" },
];

export default function DesignFoundationsPage() {
  if (!DESIGN_ROUTE_ENABLED) {
    notFound();
  }

  return (
    <main
      className="mx-auto flex w-full flex-col gap-[var(--space-block)] px-[var(--gutter)] py-[var(--space-section)]"
      style={{ maxWidth: "var(--page-max)", background: "var(--lime-wash)" }}
    >
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
          28 — fondations Nuancier
        </p>
        <h1
          className="font-display"
          style={{
            fontSize: "var(--step-4)",
            lineHeight: "var(--lh-tight)",
            letterSpacing: "var(--tracking-display)",
            color: "var(--ink)",
          }}
        >
          Tokens, échelle, motion
        </h1>
        <p style={{ maxWidth: "var(--measure)", lineHeight: "var(--lh-body)", color: "var(--ink)" }}>
          Page interne, non indexée : elle ne montre que les fondations (couleur,
          typo, échelle, espacement, socle motion) de la direction « Nuancier ».
          Les primitives (Swatch, PriceBlock, SpecTable…) arrivent en 28b.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--ink)" }}>
          Couleur
        </h2>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {colorTokens.map((token) => (
            <div key={token.name} className="flex flex-col gap-2">
              <div
                className="h-20 w-full border"
                style={{
                  background: token.value,
                  borderColor: "var(--coping)",
                  borderRadius: "var(--radius)",
                }}
              />
              <span className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink)" }}>
                {token.name}
              </span>
              <span className="text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {token.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--ink)" }}>
          Échelle typographique
        </h2>
        <div className="flex flex-col gap-4">
          {typeScale.map((entry) => (
            <div key={entry.token} className="flex items-baseline gap-4">
              <span
                className="font-mono text-[var(--step--1)]"
                style={{ color: "var(--ink-60)", width: "6rem", flexShrink: 0 }}
              >
                {entry.token}
              </span>
              <span className="font-display" style={{ fontSize: `var(${entry.token})`, color: "var(--ink)" }}>
                {entry.label}
              </span>
            </div>
          ))}
          <p className="font-mono" style={{ fontSize: "var(--step-0)", color: "var(--ink)" }}>
            42,50 m² — exemple d&apos;usage mono (nombres, cotes, références)
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--ink)" }}>
          Motion — démo <code>.reveal</code>
        </h2>
        <p style={{ maxWidth: "var(--measure)", color: "var(--ink)" }}>
          Le bloc ci-dessous est visible immédiatement (état révélé par défaut).
          Sur un navigateur qui supporte <code>animation-timeline: view()</code> et
          sans <code>prefers-reduced-motion</code>, il rejoue une entrée discrète au
          scroll. Sur Firefox stable ou avec le mouvement réduit activé, il reste
          statique — c&apos;est le comportement voulu.
        </p>
        <div
          className="reveal border p-8"
          style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", background: "var(--surface)" }}
        >
          <p className="font-display" style={{ fontSize: "var(--step-1)", color: "var(--ink)" }}>
            Bloc matière (contenu factice)
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--ink)" }}>
          Primitives (28b)
        </h2>
        <p style={{ maxWidth: "var(--measure)", lineHeight: "var(--lh-body)", color: "var(--ink)" }}>
          Les 7 primitives livrées par cette passe, sur données bidon. Mode B2C
          uniquement : le prix pro n&apos;apparaît nulle part sur cette page.
        </p>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            SwatchGroup + Swatch
          </h3>
          <div style={{ maxWidth: "28rem" }}>
            <SwatchGroup label="Coloris de la membrane (démo)" options={swatchOptions} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            PriceBlock
          </h3>
          <div
            className="border p-6"
            style={{ maxWidth: "28rem", borderColor: "var(--coping)", borderRadius: "var(--radius)", background: "var(--surface)" }}
          >
            <PriceBlock product={demoProduct} quantity={2} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            SpecTable
          </h3>
          <div style={{ maxWidth: "28rem" }}>
            <SpecTable rows={specRows} caption="Fiche technique — membrane démo" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            CollapsibleSection
          </h3>
          <div style={{ maxWidth: "var(--measure)" }}>
            <CollapsibleSection title="Description" name="pdp-demo" defaultOpen>
              <p>Contenu de démonstration, présent dans le DOM au rendu (indexable).</p>
            </CollapsibleSection>
            <CollapsibleSection title="Pose et entretien" name="pdp-demo">
              <p>Deuxième panneau — accordéon exclusif via `name=&quot;pdp-demo&quot;`.</p>
            </CollapsibleSection>
            <CollapsibleSection title="Livraison" name="pdp-demo">
              <p>Troisième panneau, toujours dans le même groupe exclusif.</p>
            </CollapsibleSection>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            StickyBuyBox
          </h3>
          <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr", maxWidth: "var(--page-max)" }}>
            <div
              className="border p-6"
              style={{ borderColor: "var(--coping)", borderRadius: "var(--radius)", minHeight: "40rem" }}
            >
              <p style={{ color: "var(--ink-60)" }}>Colonne de contenu factice (fiche produit).</p>
            </div>
            <StickyBuyBox>
              <PriceBlock product={demoProduct} />
            </StickyBuyBox>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
            Bleed
          </h3>
          <Bleed>
            <div
              className="flex items-center justify-center py-12"
              style={{ background: "var(--surface)", borderTop: "1px solid var(--coping)", borderBottom: "1px solid var(--coping)" }}
            >
              <p className="font-display" style={{ fontSize: "var(--step-1)", color: "var(--ink)" }}>
                Bloc full-bleed (démo)
              </p>
            </div>
          </Bleed>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display" style={{ fontSize: "var(--step-2)", color: "var(--ink)" }}>
          Média — coloris (couture 29/30)
        </h2>
        <p style={{ maxWidth: "var(--measure)", lineHeight: "var(--lh-body)", color: "var(--ink)" }}>
          Les 4 plans obligatoires par coloris (annexe-brief-photo), résolus
          via <code>resolvePoolMedia()</code> — placeholders neutres tant que
          les vraies photos ne sont pas livrées.
        </p>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {poolMediaPlanSchema.options.map((plan) => (
            <div key={plan} className="flex flex-col gap-2">
              <div
                className="overflow-hidden"
                style={{ borderRadius: "var(--radius)" }}
              >
                <PoolImage colorisSlug="bleu" plan={plan} className="w-full" />
              </div>
              <span className="font-mono text-[var(--step--1)]" style={{ color: "var(--ink-60)" }}>
                {plan}
              </span>
            </div>
          ))}
        </div>
        <p style={{ maxWidth: "var(--measure)", color: "var(--ink)" }}>
          {resolvePoolMedia("bleu").waterAppearance}
        </p>
      </section>
    </main>
  );
}
