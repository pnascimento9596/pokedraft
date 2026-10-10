import { defineConfig, devices } from "@playwright/test";

// Opt-in suite against a deployed URL. It writes one `verify-bot` row, so it never runs in CI.
// Usage: LIVE_URL=https://pokedraft-woad.vercel.app pnpm test:live
const baseURL = process.env.LIVE_URL;
if (!baseURL) throw new Error("Set LIVE_URL to the deployment to verify");

export default defineConfig({
  testDir: "e2e-live",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", colorScheme: "dark" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
