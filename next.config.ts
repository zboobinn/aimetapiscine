import type { NextConfig } from "next";

// CSP en Report-Only UNIQUEMENT (23) : Next.js injecte des scripts inline, une
// CSP stricte en mode bloquant casserait le site EN SILENCE sans moyen de le
// vérifier exhaustivement ici. Passage en mode bloquant : travail futur, à
// faire progressivement en observant les rapports de violation en conditions
// réelles. Ne PAS ajouter le domaine du simulateur APF en frame-src : ce
// serait une fuite blind shipping dans un header HTTP public, et la spec 16
// est reportée sine die (decisions.md, 2026-07-09).
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "frame-src https://checkout.stripe.com https://js.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
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
