import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Filet de sécurité pour la génération PDF (11) : nos polices embarquées
  // (src/lib/pdf/fonts/*.ttf, lues via fs à un chemin littéral — voir
  // src/lib/pdf/register-fonts.ts) devraient déjà être détectées par le
  // file tracing Vercel, mais on force explicitement leur inclusion dans
  // le bundle des Route Handlers pour ne jamais dépendre uniquement de
  // cette heuristique.
  outputFileTracingIncludes: {
    "/api/**": ["./src/lib/pdf/fonts/**"],
  },
};

export default nextConfig;
