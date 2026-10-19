import { expect, test, type Locator, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

// Row 3g: the scout line on the pre-match card and at half time, an edge badge on each tactic
// pill, bench cards in the open touchline sheet and the assistant's status line.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/touchline-intel";
const NO_EDGE = "Scout: no tactic has a clear edge against this opponent.";

async function toPreMatch(page: Page, panel: Record<string, unknown>): Promise<void> {
  await page.addInitScript((value) => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem("pokedraft:panel", JSON.stringify(value));
  }, panel);
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("prematch")).toBeVisible();
}

async function kickOff(page: Page): Promise<void> {
  await page.getByTestId("prematch-go").tap();
  await expect(page.getByTestId("broadcast")).toBeVisible();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
}

async function minute(page: Page): Promise<number> {
  return Number(await page.getByTestId("match-player").getAttribute("data-minute"));
}

async function sideScroll(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Every visible button and interactive row inside `root` under 44 px on a side. */
async function smallControls(root: Locator): Promise<string[]> {
  return root.evaluate((el) => {
    const out: string[] = [];
    const view = el.getBoundingClientRect();
    for (const c of el.querySelectorAll<HTMLElement>("button, select, input, [role=button]")) {
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom <= view.top || r.top >= view.bottom) continue;
      if (Math.min(r.width, r.height) < 44)
        out.push(`${c.dataset.testid ?? c.textContent?.trim()} ${r.width}x${r.height}`);
    }
    return out;
  });
}

async function pitchAboveSheet(page: Page): Promise<{ pitchBottom: number; sheetTop: number }> {
  const pitch = await page.getByTestId("broadcast").boundingBox();
  const sheet = await page.getByTestId("touchline-sheet").boundingBox();
  expect(pitch).not.toBeNull();
  expect(sheet).not.toBeNull();
  expect(pitch!.y).toBeGreaterThanOrEqual(0);
  expect(pitch!.y + pitch!.height).toBeLessThanOrEqual(sheet!.y);
  return { pitchBottom: Math.round(pitch!.y + pitch!.height), sheetTop: Math.round(sheet!.y) };
}

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
] as const) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test("the pre-match card shows the scout line and badged pills; the open sheet shows bench cards with the fit glyph and no numbers, and a tactic switches the assistant off (catches missing touchline intelligence)", async ({
      page,
    }) => {
      test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
      await toPreMatch(page, { managerMode: true, matchView: "live" });
      const scout = page.getByTestId("scout-line");
      await expect(scout).toHaveText(/^Scout: /);
      const line = (await scout.textContent()) ?? "";
      const pills = page.getByRole("group", { name: "Starting tactic" });
      await expect(pills.locator('[data-testid^="edge-"]')).toHaveCount(line === NO_EDGE ? 0 : 5);
      expect(await smallControls(page.getByTestId("prematch"))).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      console.log(`${width}x${height} pre-match scout line: ${line}`);
      await scout.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/${width}-prematch-scout.png` });

      await kickOff(page);
      const status = page.getByTestId("assistant-status");
      await expect(status).toHaveText("Assistant: subs on, tactics on");
      const collapsed = await pitchAboveSheet(page);
      const sheetBox = await page.getByTestId("touchline-sheet").boundingBox();
      console.log(
        `${width}x${height} collapsed sheet ${Math.round(sheetBox!.height)} px from y ${collapsed.sheetTop}, pitch bottom ${collapsed.pitchBottom}`,
      );

      const toggle = page.getByTestId("sheet-toggle");
      await toggle.tap();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const cards = page.locator('[data-testid^="bench-card-"]');
      expect(await cards.count()).toBeGreaterThan(0);
      await expect(cards.first().locator("[data-fit]")).toHaveText(/^(★ Best|OK|Poor)$/);
      for (const text of await cards.allTextContents()) expect(text).not.toMatch(/\d/);
      await expect(cards.first().locator("[data-numbers]")).toHaveCount(0);
      const sheet = page.getByTestId("touchline-sheet");
      expect(await smallControls(sheet)).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      const open = await pitchAboveSheet(page);
      console.log(
        `${width}x${height} open sheet from y ${open.sheetTop}, pitch bottom ${open.pitchBottom}`,
      );
      await cards.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/${width}-sheet-bench.png` });

      const current = await sheet
        .locator('[data-testid^="tactic-"][aria-pressed="true"]')
        .getAttribute("data-testid");
      const other = current === "tactic-attack" ? "tactic-defend" : "tactic-attack";
      await sheet.getByTestId(other).scrollIntoViewIfNeeded();
      await sheet.getByTestId(other).tap();
      await expect(status).toHaveText("Assistant: subs off, tactics off");
    });
  });
}

test.describe("at 390x844 with touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("with ratings on, bench cards add the fit score for the outgoing slot and STA", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await toPreMatch(page, { managerMode: true, matchView: "live", showChallengeRatings: true });
    await kickOff(page);
    await page.getByTestId("sheet-toggle").tap();
    const numbers = page.locator('[data-testid^="bench-card-"] [data-numbers]');
    expect(await numbers.count()).toBeGreaterThan(0);
    for (const text of await numbers.allTextContents()) {
      expect(text).toMatch(/^Fit \d+, STA \d+$/);
    }
    await page.locator('[data-testid^="bench-card-"]').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/390-sheet-bench-ratings.png` });
  });

  test("the half-time stop repeats the scout line and names the two most tired players", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    test.setTimeout(180_000);
    await toPreMatch(page, { managerMode: true, matchView: "live" });
    const line = await page.getByTestId("scout-line").textContent();
    await kickOff(page);
    await page.getByTestId("speed-toggle").tap();
    const halftime = page.getByTestId("stop-halftime");
    const injury = page.getByTestId("stop-injury");
    for (let i = 0; i < 12 && !(await halftime.isVisible()); i++) {
      await expect(halftime.or(injury)).toBeVisible({ timeout: 40_000 });
      if (await injury.isVisible()) await page.getByTestId("injury-confirm").tap();
    }
    await expect(halftime.getByTestId("halftime-scout")).toHaveText(line ?? "");
    const fatigue = halftime.getByTestId("halftime-fatigue");
    await expect(fatigue).toHaveText(/^Most tired: .+ \(\d+\) and .+ \(\d+\)\.$/);
    console.log(`390 half time: ${await fatigue.textContent()}`);
    await pitchAboveSheet(page);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOT}/390-halftime-fatigue.png` });
  });
});

test("from 600px up the bench cards and the assistant status sit in the page touchline, at 1280px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 1280, height: 900 });
  await toPreMatch(page, { managerMode: true, matchView: "live" });
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("broadcast")).toBeVisible();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
  await page.getByTestId("play-toggle").click();
  await expect(page.getByTestId("sheet-toggle")).toBeHidden();
  await expect(page.getByTestId("assistant-status")).toHaveText("Assistant: subs on, tactics on");
  await expect(page.locator('[data-testid^="bench-card-"]').first()).toBeVisible();
  expect(await sideScroll(page)).toBeLessThanOrEqual(0);
  const touchline = await page.getByTestId("touchline").boundingBox();
  console.log(`1280 touchline ${Math.round(touchline!.width)}x${Math.round(touchline!.height)}`);
  await page.screenshot({ path: `${SHOT}/1280-desktop.png`, fullPage: true });
});
