import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" lève inconditionnellement hors du pipeline webpack
      // Next.js (24) — neutralisé pour les tests des modules server-only
      // purs (pricing, port, PDF) ; jamais utilisé en dehors de vitest.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
