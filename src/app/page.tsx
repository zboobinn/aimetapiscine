import type { Metadata } from "next";
import { CalculatorTeaserLoader } from "@/features/home/calculator-teaser-loader";
import { resolveCheapestMembranePricing } from "@/features/home/cheapest-membrane-pricing";
import { Faq } from "@/features/home/faq";
import { HOME_FAQ_ITEMS, withRemakeGuaranteeAnswer } from "@/features/home/faq-data";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { Nuancier } from "@/features/home/nuancier";
import { ProSpace } from "@/features/home/pro-space";
import { ReassuranceBar } from "@/features/home/reassurance-bar";
import { SocialProofPlaceholder } from "@/features/home/social-proof-placeholder";
import { WhyMembraneBento } from "@/features/home/why-membrane-bento";
import { buildHeroSwatchOptions } from "@/features/home/hero-swatch-options";
import { getBusinessConfigEnv } from "@/lib/env";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildFaqPageJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const swatchOptions = buildHeroSwatchOptions();
  const cheapestMembranePricing = resolveCheapestMembranePricing();
  const { LOSS_COEFF_BASE, LOSS_COEFF_STAIRS } = getBusinessConfigEnv();
  // Accès LITTÉRAL (28, piège NEXT_PUBLIC_*) : lu indépendamment par `Faq`
  // (rendu) pour garantir que texte affiché et texte balisé ne divergent
  // jamais — les deux occurrences littérales du même nom sont inlinées à la
  // même valeur au build.
  const faqJsonLdItems = withRemakeGuaranteeAnswer(HOME_FAQ_ITEMS, process.env.NEXT_PUBLIC_REMAKE_GUARANTEE);

  return (
    <div className="flex flex-col">
      {/* Organization : déplacé dans app/layout.tsx (30, site-wide, pas seulement `/`). */}
      <JsonLd data={buildWebsiteJsonLd()} />
      <JsonLd data={buildFaqPageJsonLd(faqJsonLdItems)} />
      <Hero swatchOptions={swatchOptions} />
      <ReassuranceBar />
      {cheapestMembranePricing ? (
        <CalculatorTeaserLoader
          pricing={cheapestMembranePricing}
          lossCoeffBase={LOSS_COEFF_BASE}
          lossCoeffStairs={LOSS_COEFF_STAIRS}
        />
      ) : null}
      <Nuancier />
      <HowItWorks />
      {/*
        Section 06 « Preuve — bassins réalisés » : placeholder VIDE,
        volontairement. Elle exige de vrais avis clients (spec 31, modération
        a priori D9) et de vraies photos client consenties
        (annexe-brief-photo) — aucun des deux n'existe. Ne pas la construire
        avec de faux avis ou témoignages. Laissée à la spec 31.
      */}
      <SocialProofPlaceholder />
      <WhyMembraneBento />
      <ProSpace />
      <Faq items={HOME_FAQ_ITEMS} />
    </div>
  );
}
