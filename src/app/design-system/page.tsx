import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/ui/price";
import { Stepper } from "@/components/ui/stepper";

// Page de démo interne (decisions.md, 2026-07-07). Le `noindex` seul (18)
// n'empêche pas l'accès direct à l'URL en prod (23) — repli sur `notFound()`
// hors développement plutôt que la suppression pure : la page reste utile en
// local pour visualiser les tokens/composants du design system (05).
export const metadata: Metadata = {
  title: "Design system | ArmaPool",
  robots: { index: false, follow: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-b border-border py-12">
      <h2 className="font-heading text-2xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6">
      <header className="flex flex-col gap-2 py-16">
        <p className="font-medium text-accent">Design system</p>
        <h1 className="font-heading text-4xl font-semibold text-ink">
          ArmaPool — composants de base
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Page de démonstration temporaire : tokens et composants UI définis
          dans docs/05-design-css.md.
        </p>
      </header>

      <Section title="Couleurs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { name: "background", className: "bg-background border border-border" },
            { name: "surface", className: "bg-surface" },
            { name: "ink", className: "bg-ink" },
            { name: "ink-muted", className: "bg-ink-muted" },
            { name: "accent", className: "bg-accent" },
            { name: "accent-hover", className: "bg-accent-hover" },
            { name: "danger", className: "bg-danger" },
            { name: "success", className: "bg-success" },
          ].map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div className={`h-16 w-full rounded-md ${swatch.className}`} />
              <span className="text-sm text-ink-muted">{swatch.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typographie">
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl font-semibold text-ink">
            Titre H1 — Manrope 600
          </h1>
          <h2 className="font-heading text-2xl font-semibold text-ink">
            Titre H2 — Manrope 600
          </h2>
          <h3 className="font-heading text-lg font-medium text-ink">
            Titre H3 — Manrope 500
          </h3>
          <p className="text-base text-ink">
            Texte courant — Inter. Membrane armée 150/100e, résistante aux UV
            et aux traitements chlorés, posée par un réseau de professionnels
            qualifiés.
          </p>
          <p className="text-sm text-ink-muted">
            Texte secondaire — Inter, ink-muted.
          </p>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Ajouter au panier</Button>
          <Button variant="secondary">Voir la fiche produit</Button>
          <Button variant="ghost">Annuler</Button>
          <Button variant="primary" disabled>
            Indisponible
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="sm">
            Petit
          </Button>
          <Button variant="primary" size="md">
            Moyen
          </Button>
          <Button variant="primary" size="lg">
            Grand
          </Button>
        </div>
      </Section>

      <Section title="Champs de formulaire">
        <div className="grid max-w-md gap-6">
          <Input label="Adresse e-mail" placeholder="vous@exemple.fr" />
          <Input
            label="SIRET"
            placeholder="123 456 789 00012"
            hint="14 chiffres, requis pour un compte professionnel."
          />
          <Input
            label="Code postal"
            defaultValue="750"
            error="Code postal invalide."
          />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="in-stock">En stock</Badge>
          <Badge variant="out-of-stock">Rupture de stock</Badge>
          <Badge variant="promo">Pack -5 %</Badge>
          <Badge variant="neutral">Nouveau</Badge>
        </div>
      </Section>

      <Section title="Stepper (calculateur)">
        <Stepper
          currentStep={2}
          steps={[
            { label: "Dimensions" },
            { label: "Forme du bassin" },
            { label: "Accessoires" },
            { label: "Récapitulatif" },
          ]}
        />
      </Section>

      <Section title="Prix (composant Price)">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Particulier (TTC)</span>
              <Price amountCents={124900} role="b2c" size="lg" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">
                Particulier — pack -5 % (TTC)
              </span>
              <Price
                amountCents={118655}
                compareAtAmountCents={124900}
                role="b2c"
                size="lg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Pro vérifié (HT)</span>
              <Price amountCents={104083} role="b2b" size="lg" />
            </div>
          </div>
          <div className="flex items-end gap-6">
            <Price amountCents={4900} size="sm" />
            <Price amountCents={4900} size="md" />
            <Price amountCents={4900} size="lg" />
          </div>
        </div>
      </Section>

      <Section title="Card produit">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ProductCard
            imageSrc="/window.svg"
            imageAlt="Membrane armée bleu piscine"
            title="Membrane armée 150/100e — Bleu piscine"
            subtitle="Au mètre linéaire, laize 1,65 m"
            badge={<Badge variant="in-stock">En stock</Badge>}
            price={<Price amountCents={4900} role="b2c" />}
          />
          <ProductCard
            imageSrc="/globe.svg"
            imageAlt="Pack prêt à poser"
            title="Pack prêt à poser — Bassin 8x4"
            subtitle="Membrane + profilés + accessoires de pose"
            badge={<Badge variant="promo">Pack -5 %</Badge>}
            price={
              <Price
                amountCents={118655}
                compareAtAmountCents={124900}
                role="b2c"
              />
            }
          />
          <ProductCard
            imageSrc="/file.svg"
            imageAlt="Joint de finition"
            title="Joint de finition périphérique"
            subtitle="Vendu à l'unité"
            badge={<Badge variant="out-of-stock">Rupture de stock</Badge>}
            price={<Price amountCents={2900} role="b2c" />}
          />
        </div>
      </Section>

      <Section title="Focus clavier">
        <p className="max-w-2xl text-ink-muted">
          Naviguez au clavier (Tab) sur les éléments ci-dessous : un anneau
          accent doit apparaître autour de l&apos;élément actif.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Bouton</Button>
          <Input placeholder="Champ texte" />
          <a href="#" className="self-center font-medium text-accent underline">
            Lien
          </a>
        </div>
      </Section>
    </main>
  );
}
