import type { Metadata } from "next";
import { Hero } from "@/features/home/hero";
import { ReassuranceBar } from "@/features/home/reassurance-bar";
import { buildHeroSwatchOptions } from "@/features/home/hero-swatch-options";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const swatchOptions = buildHeroSwatchOptions();

  return (
    <div className="flex flex-col">
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildWebsiteJsonLd()} />
      <Hero swatchOptions={swatchOptions} />
      <ReassuranceBar />
      {/*
        Sections 03–10 (30 §, teaser calculateur, nuancier, comment ça marche,
        preuve, bento, espace pro, FAQ, footer) : hors périmètre de cette
        passe (30-②/30-③), à construire dans les passes suivantes.
      */}
    </div>
  );
}
