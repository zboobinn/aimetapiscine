/**
 * Setup Vitest global (spec 27). Injecte une denylist FACTICE pour le
 * garde-fou blind shipping — jamais la vraie liste, qui ne vit que dans
 * l'environnement serveur réel (`BLIND_SHIPPING_DENYLIST`, non commitée).
 *
 * "zolvex", "brumanor" et "zvx" sont des noms/sigles d'entreprise inventés,
 * sans rapport avec le vrai fournisseur. Format : tokens MONO-MOT séparés
 * par des virgules (voir `src/lib/blind-shipping.ts`, D11). "zvx" (3
 * caractères, < 5) sert spécifiquement à tester la limite de couverture
 * D10/D11 : autorisé mais exclu de la passe 3 (substring agressif).
 */
process.env.BLIND_SHIPPING_DENYLIST = "zolvex,brumanor,zvx";

// `buildProductJsonLd` appelle `absoluteUrl()` (`getSiteEnv()`, 18/26), qui
// throw si `NEXT_PUBLIC_SITE_URL` est absent — valeur de test uniquement,
// jamais utilisée pour un appel réseau réel.
process.env.NEXT_PUBLIC_SITE_URL ??= "https://aimetapiscine.fr";
