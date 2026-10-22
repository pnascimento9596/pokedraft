import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@/components/scouting/DossierModal": path.resolve(
        import.meta.dirname,
        "src/components/scouting/DossierModal.test-sync.tsx",
      ),
      "@": path.resolve(import.meta.dirname, "src"),
      // Next resolves this marker to an empty module on the server; Vitest is the server here.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    // `*.slow.test.ts` files are receipt runs for reviewers; SLOW_TESTS=1 includes them.
    exclude: process.env.SLOW_TESTS
      ? configDefaults.exclude
      : [...configDefaults.exclude, "**/*.slow.test.ts"],
    environment: "node",
    css: { modules: { classNameStrategy: "non-scoped" } },
    testTimeout: 15_000,
  },
});
