import { expect, test, type Page } from "@playwright/test";
import { DEEP_LINK, RUN_151 } from "./pins";
import { ready } from "./mobile/scenes";

const SHOT = "docs/reports/copy-pass";
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

test.use({ hasTouch: true, isMobile: true });

const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

/** Every text node and aria-label under the results that names the run's side as You or Your. */
const saysYou = (page: Page) =>
  page.getByTestId("results").evaluate((root) => {
    const said: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      said.push(node.textContent ?? "");
    }
    for (const el of root.querySelectorAll("[aria-label]"))
      said.push(el.getAttribute("aria-label")!);
    return said.filter((t) => /\b(You|Your)\b/.test(t));
  });

async function start(page: Page): Promise<void> {
  await page.goto(RUN_151.url);
  const go = page.getByTestId("run-start");
  await ready(page, go);
  await go.click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
}

test.describe("draft drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("reads Show roll while the wheel spins (catches View spinner)", async ({ page }) => {
    await start(page);
    const toggle = page.getByTestId("draft-drawer").locator("button").first();
    await expect(toggle).toHaveText("Hide players");
    await toggle.tap();
    await expect(toggle).toHaveText("Show roll");
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/draft-spinning-390.png` });
    await expect(toggle).toHaveText("Show players", { timeout: 15_000 });
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("says Hide players, Show players and Show roll, and names fits Best, OK and Poor (catches Minimize draft picker and the raw enum)", async ({
      page,
    }) => {
      await start(page);
      const toggle = page.getByTestId("draft-drawer").locator("button").first();
      await expect(toggle).toHaveText("Hide players");
      await page.screenshot({ path: `${SHOT}/draft-drawer-open-390.png` });

      await page.locator('[data-testid^="candidate-"]').first().tap();
      const back = page.getByRole("button", { name: "Back to the roll" });
      await expect(back).toHaveText("Show roll");
      await expect(toggle).toHaveText("Show players");
      await page.screenshot({ path: `${SHOT}/draft-selection-390.png` });
      const prompts = await page
        .locator('[data-testid^="slot-"][data-suitability] [data-suitability]')
        .allTextContents();
      expect(prompts.length).toBeGreaterThan(0);
      for (const p of prompts) expect(["★ Best", "OK", "Poor"]).toContain(p);
      const names = await page
        .locator('[data-testid^="slot-"][data-suitability]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
      for (const n of names) expect(n).toMatch(/^Empty .+ slot \((Best|OK|Poor) fit\)$/);
      expect(await fitsWidth(page)).toBe(true);
      await toggle.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/draft-show-players-390.png` });
    });
  });
});

for (const width of [390, 360, 320]) {
  test(`a shared run says This squad, never You, at ${width}px (catches a friend's squad called You)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/r/${DEEP_LINK.token}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
    expect(await saysYou(page)).toEqual([]);
    const g1 = page.getByTestId("match-G1");
    await expect(g1.getByText("This squad", { exact: true })).toHaveCount(2);
    await expect(page.locator("tr[data-user] th")).toHaveText("1This squad");
    expect(await fitsWidth(page)).toBe(true);
    await g1.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/shared-results-${width}.png` });
  });
}

test.describe("scoreboard and history", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the scoreboard shows 1-0 with no spaces (catches 1 - 0)", async ({ page }) => {
    await page.goto(DEEP_LINK.href);
    const score = page.getByTestId("match-replay").getByTestId("matchday-score");
    await expect(score).toHaveText("1-0", { timeout: 10_000 });
    await page
      .getByTestId("matchday-scoreboard")
      .screenshot({ path: `${SHOT}/scoreboard-390.png` });
  });

  test("the history page reads its limit, 50, from HISTORY_LIMIT", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your last 50 runs");
    await expect(
      page.getByText("Totals that keep counting past the last 50 runs, and a backup file."),
    ).toBeVisible();
    expect(await page.locator("main").evaluate((m) => m.textContent ?? "")).not.toMatch(DASHES);
    expect(await fitsWidth(page)).toBe(true);
    await page.screenshot({ path: `${SHOT}/history-390.png` });
  });
});
