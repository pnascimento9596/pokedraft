import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL points the suite at a running deployment and turns the local server off, so
// the mobile acceptance suite can run against production:
//   PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test e2e/mobile-acceptance.spec.ts
// PLAYWRIGHT_PORT moves the local `next start` server off the default port.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const PORT = Number(process.env.PLAYWRIGHT_PORT) || 3400;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The phone projects paint in software on Linux CI, so they are CPU bound. Use all four vCPUs.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile-(acceptance|targets)/,
    },
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"] },
      testMatch: /mobile-(acceptance|targets)\.spec\.ts/,
    },
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
      testMatch: /mobile-(acceptance|targets)\.spec\.ts/,
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile-(acceptance|targets)\.spec\.ts/,
    },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
