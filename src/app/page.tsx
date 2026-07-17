import type { Metadata } from "next";
import { CalculatorTeaserLoader } from "@/features/home/calculator-teaser-loader";
import { resolveCheapestMembranePricing } from "@/features/home/cheapest-membrane-pricing";
import { Hero } from "@/features/home/hero";
import { ReassuranceBar } from "@/features/home/reassurance-bar";
import { buildHeroSwatchOptions } from "@/features/home/hero-swatch-options";
import { getBusinessConfigEnv } from "@/lib/env";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const swatchOptions = buildHeroSwatchOptions();
  const cheapestMembranePricing = resolveCheapestMembranePricing();
  const { LOSS_COEFF_BASE, LOSS_COEFF_STAIRS } = getBusinessConfigEnv();

  return (
    <div className="flex flex-col">
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildWebsiteJsonLd()} />
      <Hero swatchOptions={swatchOptions} />
      <ReassuranceBar />
      {cheapestMembranePricing ? (
        <CalculatorTeaserLoader
          pricing={cheapestMembranePricing}
          lossCoeffBase={LOSS_COEFF_BASE}
          lossCoeffStairs={LOSS_COEFF_STAIRS}
        />
      ) : null}
      {/*
        Sections 04–10 (30 §, nuancier, comment ça marche, preuve, bento,
        espace pro, FAQ, footer) : hors périmètre de cette passe (30-③), à
        construire dans les passes suivantes.
      */}
    </div>
  );
}
