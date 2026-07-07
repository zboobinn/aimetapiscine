/**
 * Hook Next.js exécuté une seule fois au démarrage du serveur (dev, build,
 * prod). Sert à conserver l'échec strict "au boot si une variable du socle
 * applicatif manque" exigé par la spec 26 — mais seulement pour le socle
 * (site + Supabase). Les variables des specs pas encore développées
 * (analytics, Stripe, Resend, société…) sont validées au premier usage par
 * le code qui les consomme, pas ici (voir `lib/env`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCoreEnv } = await import("@/lib/env");
    assertCoreEnv();
  }
}
