/**
 * Hook Next.js exécuté une seule fois au démarrage du serveur (dev, build,
 * prod). Sert à conserver l'échec strict "au build si une variable manque"
 * exigé par la spec 26, alors que le reste du code ne valide plus que les
 * variables d'environnement dont il a réellement besoin (voir `lib/env`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertFullEnv } = await import("@/lib/env");
    assertFullEnv();
  }
}
