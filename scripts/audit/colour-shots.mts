// Screenshots for the colour token pixel check: home, a draft six picks in, results, the match
// highlights and a frozen matchday frame, at 390x844 in light and dark. Headless Chromium, reduced
// motion, animations off, and a fixed clock so the same build draws the same pixels.
//   pnpm exec tsx scripts/audit/colour-shots.mts --base-url http://localhost:3999 --out DIR
// Compare two runs with scripts/audit/pixel-diff.mts.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium, expect, type Page } from "@playwright/test";
import { DEEP_LINK, RUN_151 } from "../../e2e/pins";
import fixtures from "./fixtures.json";

const { values } = parseArgs({
  options: { "base-url": { type: "string" }, out: { type: "string" } },
});
if (!values["base-url"] || !values.out)
  throw new Error("usage: colour-shots.mts --base-url URL --out DIR");
const base = values["base-url"];
const out = path.resolve(values.out);
mkdirSync(out, { recursive: true });

const CLOCK = new Date("2026-10-18T12:00:00Z");

const scenes: Record<string, (page: Page) => Promise<void>> = {
  async home(page) {
    await page.goto(`${base}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  },
  async road(page) {
    await page.goto(`${base}${RUN_151.url}`);
    await expect(page.getByTestId("run-start")).toBeVisible();
  },
  async draft(page) {
    await page.goto(`${base}${RUN_151.url}`);
    const header = page.getByTestId("round-header");
    await expect(async () => {
      await page.getByTestId("run-start").click({ timeout: 1_000 });
      await expect(header).toBeVisible({ timeout: 1_000 });
    }).toPass();
    for (let round = 1; round <= 6; round++) {
      await expect(header).toContainText(`Round ${round} of 16`);
      await page.locator('[data-testid^="candidate-"]').first().click();
      await page
        .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
        .first()
        .click();
    }
    await expect(header).toContainText("Round 7 of 16");
  },
  async pitch(page) {
    await scenes.draft!(page);
    await page.getByRole("button", { name: "Hide players" }).click();
    await page.evaluate(() => scrollTo(0, 0));
  },
  async results(page) {
    await page.goto(`${base}/r/${fixtures.shareRun.token}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
  },
  async highlights(page) {
    await page.goto(`${base}/r/${fixtures.shareRun.token}`);
    await page.getByTestId("match-highlights").scrollIntoViewIfNeeded();
  },
  async matchday(page) {
    await page.goto(`${base}${DEEP_LINK.href}`);
    await expect(page.getByTestId("broadcast")).toBeVisible();
    await page.clock.pauseAt(new Date(CLOCK.getTime() + 3_000));
    await page.getByTestId("broadcast").scrollIntoViewIfNeeded();
  },
};

const browser = await chromium.launch();
for (const theme of ["light", "dark"] as const) {
  for (const [name, scene] of Object.entries(scenes)) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.clock.install({ time: CLOCK });
    await scene(page);
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(out, `${name}-${theme}.png`);
    if (name === "highlights")
      await page.getByTestId("match-highlights").screenshot({ path: file, animations: "disabled" });
    else
      await page.screenshot({ path: file, fullPage: name === "results", animations: "disabled" });
    console.log(file);
    await context.close();
  }
}
await browser.close();
