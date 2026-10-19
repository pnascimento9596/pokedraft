// Screenshots for the breakpoint and theme proof: home, a draft six picks in, results and a frozen
// matchday frame at 320, 360, 390, 720, 960 and 1280 wide, in light and dark. Prints one JSON line
// per shot with the page's scroll width, so a horizontal overflow shows up next to its picture.
//   pnpm exec tsx scripts/audit/breakpoint-shots.mts --base-url http://localhost:3999 --out DIR
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium, expect, type Page } from "@playwright/test";
import { DEEP_LINK, RUN_151 } from "../../e2e/pins";
import fixtures from "./fixtures.json";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string" },
    out: { type: "string" },
    widths: { type: "string" },
    scenes: { type: "string" },
  },
});
if (!values["base-url"] || !values.out)
  throw new Error(
    "usage: breakpoint-shots.mts --base-url URL --out DIR [--widths 390,960] [--scenes home]",
  );
const base = values["base-url"];
const out = path.resolve(values.out);
mkdirSync(out, { recursive: true });

const CLOCK = new Date("2026-10-18T12:00:00Z");
const WIDTHS = (values.widths ?? "320,360,390,720,960,1280").split(",").map(Number);
const heightFor = (width: number) => (width < 720 ? 844 : width < 1280 ? 800 : 720);

const scenes: Record<string, (page: Page) => Promise<void>> = {
  async home(page) {
    await page.goto(`${base}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await page.evaluate(() => scrollTo(0, 0));
  },
  async results(page) {
    await page.goto(`${base}/r/${fixtures.shareRun.token}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
  },
  async matchday(page) {
    await page.goto(`${base}${DEEP_LINK.href}`);
    await expect(page.getByTestId("broadcast")).toBeVisible();
    await page.clock.pauseAt(new Date(CLOCK.getTime() + 3_000));
    await page.getByTestId("broadcast").scrollIntoViewIfNeeded();
  },
};
const chosen = values.scenes ? values.scenes.split(",") : Object.keys(scenes);

const browser = await chromium.launch();
for (const theme of ["light", "dark"] as const) {
  for (const name of chosen) {
    const scene = scenes[name];
    if (!scene) throw new Error(`unknown scene ${name}`);
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: heightFor(width) },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.clock.install({ time: CLOCK });
      await scene(page);
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(out, `${name}-${width}-${theme}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(JSON.stringify({ file: path.basename(file), width, scrollWidth }));
      await context.close();
    }
  }
}
await browser.close();
