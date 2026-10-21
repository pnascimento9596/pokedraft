import { defineConfig, devices } from "@playwright/test";
import { gateCookies } from "./e2e/gate-cookie";
import { localServerPort, worktreeHead } from "./e2e/local-server";

// PLAYWRIGHT_BASE_URL points the suite at a running deployment and turns the local server off, and
// PLAYWRIGHT_GATE_COOKIE_FILE adds the passcode gate cookie when the deployment is gated:
//   PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app PLAYWRIGHT_GATE_COOKIE_FILE=$HOME/.pokedraft/friends-passcode-cookie pnpm exec playwright test <specs> --project=chromium --retries=0
// PLAYWRIGHT_PORT moves the local `next start` server. Without it each checkout gets its own port
// from its path, and e2e/global-setup.ts refuses a reused server built from another commit.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const PORT = Number(process.env.PLAYWRIGHT_PORT) || localServerPort(process.cwd());
const HEAD = worktreeHead();
const ORIGIN = BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The phone projects paint in software on Linux CI, so they are CPU bound. Use all four vCPUs.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Small text has different font metrics on macOS and Linux; each has a reviewed reference.
  expect: {
    toHaveScreenshot: { pathTemplate: "{testDir}/{testFilePath}-snapshots/{platform}/{arg}{ext}" },
  },
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
    colorScheme: "dark",
    // Every spec starts as a returning player who has seen the first-draft tip.
    // e2e/resilience-a11y.spec.ts clears this to play a first visit.
    storageState: {
      cookies: gateCookies(BASE_URL, process.env.PLAYWRIGHT_GATE_COOKIE_FILE),
      origins: [
        { origin: ORIGIN, localStorage: [{ name: "pokedraft:coach:draft", value: "true" }] },
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile-(acceptance|targets|draft)/,
    },
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"] },
      testMatch: /mobile-(acceptance|targets|draft)\.spec\.ts/,
    },
    {
      name: "webkit-wheel",
      use: { browserName: "webkit" },
      testMatch: /wheel-results\.spec\.ts/,
    },
    {
      name: "webkit-progress",
      use: { ...devices["iPhone 14"] },
      testMatch: /progress-isolation\.spec\.ts/,
    },
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
      testMatch: /(mobile-(acceptance|targets|draft)|one-tap-play)\.spec\.ts/,
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
      // Manager mode reads the share link from the clipboard, which WebKit cannot grant.
      testMatch: /(mobile-(acceptance|targets|draft)|manager-mode)\.spec\.ts/,
    },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        // /api/health reports this as its sha, so global setup can tell this checkout's server apart.
        env: HEAD === null ? {} : { VERCEL_GIT_COMMIT_SHA: HEAD },
        timeout: 60_000,
      },
});
