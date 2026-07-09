// Stub vitest de "server-only" (24) : ce paquet lève inconditionnellement
// dès qu'il est importé hors du pipeline webpack Next.js (qui l'alias vers
// un no-op côté serveur et le fait échouer côté client) — vitest tourne en
// Node pur, aucun des deux mécanismes n'existe. Les modules qui l'importent
// (pricing, port, PDF) restent bien "server-only" en prod : ce stub n'existe
// que dans `vitest.config.ts` (resolve.alias), jamais dans le bundle Next.js.
export {};
