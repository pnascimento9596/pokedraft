import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { LIVE_GOLDEN_CUP8, XG_RIVER as PIN } from "./pins";

// The golden cup8 draft under the live prefix, and the same run as engine 5 played it.
const LIVE = LIVE_GOLDEN_CUP8;
const RETAINED = GOLDEN_CUP8_V5;
const SHOT = "docs/reports/xg-river";
const LABEL = /^Chances so far: this squad \d+\.\d, them \d+\.\d$/;

async function watchPinned(page: Page, token: string): Promise<string[]> {
  const hydration: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) hydration.push(m.text());
  });
  // The results page mounts the seed board, and the local server has no database.
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        mode: url.searchParams.get("mode"),
        scope: "seed",
        date: null,
        coach: "all",
        engine: "all",
        seed: url.searchParams.get("seed"),
        entries: [],
      },
    });
  });
  await page.goto(`/r/${token}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${PIN.round}`).getByTestId("watch-live").click();
  await expect(page.getByTestId("match-replay").getByTestId("broadcast")).toBeVisible();
  return hydration;
}

async function pauseAt(page: Page, minute: number): Promise<number> {
  const player = page.getByTestId("match-replay").getByTestId("match-player");
  await expect
    .poll(async () => Number(await player.getAttribute("data-minute")), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(minute);
  await page.getByTestId("play-toggle").click();
  await expect(page.getByTestId("play-toggle")).toHaveText("Resume");
  return Number(await player.getAttribute("data-minute"));
}

/** A viewport capture with the scoreboard, the HUD and the river at the top. */
async function shoot(page: Page, path: string): Promise<void> {
  await page
    .getByTestId("match-replay")
    .getByTestId("matchday-scoreboard")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({ path });
}

/** The river's parts and the HUD row above it, so a test can see overlap and clipping. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="match-hud"]')!;
    const river = hud.querySelector('[data-testid="xg-river"]')!;
    const meter = hud.querySelector('[role="meter"]')!.getBoundingClientRect();
    const box = river.getBoundingClientRect();
    const parts = [...river.children].map((c) => c.getBoundingClientRect());
    let overlap = 0;
    for (let i = 1; i < parts.length; i++) {
      overlap = Math.max(overlap, parts[i - 1]!.right - parts[i]!.left);
    }
    return {
      viewport: innerWidth,
      riverTop: Math.round(box.top),
      meterBottom: Math.round(meter.bottom),
      riverRight: Math.round(Math.max(...parts.map((p) => p.right))),
      hudRight: Math.round(hud.getBoundingClientRect().right),
      chartWidth: Math.round(parts[2]!.width),
      partOverlap: Math.round(overlap),
      pageScrolls: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

test.beforeEach(() => {
  test.skip(test.info().project.name !== "chromium", "the viewports are set explicitly");
});

test("a retained engine-5 run draws no river and a live-engine run does (catches a story the live engine cannot replay)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const old = await watchPinned(page, RETAINED);
  await expect(page.getByTestId("match-hud")).toBeVisible();
  await expect(page.getByTestId("xg-river")).toHaveCount(0);
  expect(old).toEqual([]);

  const live = await watchPinned(page, LIVE);
  const river = page.getByTestId("xg-river");
  await expect(river).toBeVisible();
  await expect(river).toHaveAttribute("role", "img");
  await expect(river).toHaveAttribute("aria-label", LABEL);
  await expect(river).toContainText("Chances (xG)");
  await page.getByTestId("skip-ft").click();
  await expect(river).toHaveAttribute("aria-label", PIN.fullTime);
  await expect(river).toHaveAttribute("data-windows", String(PIN.windows));
  expect(live).toEqual([]);
});

for (const { width, height } of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 640 },
]) {
  test(`the river sits under the HUD at 30', half time and full time at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await watchPinned(page, LIVE);
    const river = page.getByTestId("xg-river");
    // The follow camera zooms on phones; the full pitch keeps the screenshot comparable.
    await page.getByTestId("camera-full").click();

    const at30 = await pauseAt(page, 30);
    await expect(river).toHaveAttribute("data-windows", String(Math.floor(at30 / 5)));
    const m30 = await measure(page);
    await shoot(page, `${SHOT}/river-30-${width}.png`);

    await page.getByTestId("play-toggle").click();
    const atHt = await pauseAt(page, 45);
    await expect(river).toHaveAttribute("data-windows", String(Math.floor(atHt / 5)));
    const mHt = await measure(page);
    await shoot(page, `${SHOT}/river-ht-${width}.png`);

    await page.getByTestId("skip-ft").click();
    await expect(river).toHaveAttribute("aria-label", PIN.fullTime);
    const mFt = await measure(page);
    await shoot(page, `${SHOT}/river-ft-${width}.png`);

    console.log(`${width}px at ${at30}', ${atHt}', FT: ${JSON.stringify([m30, mHt, mFt])}`);
    for (const m of [m30, mHt, mFt]) {
      expect(m.riverTop).toBeGreaterThanOrEqual(m.meterBottom);
      expect(m.riverRight).toBeLessThanOrEqual(m.hudRight);
      expect(m.partOverlap).toBeLessThanOrEqual(0);
      expect(m.chartWidth).toBeGreaterThanOrEqual(36);
      expect(m.pageScrolls).toBe(false);
    }
  });
}

test("the river still fits at 308px (hosted Linux fonts run wider than macOS)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 308, height: 640 });
  await watchPinned(page, LIVE);
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("xg-river")).toHaveAttribute("aria-label", PIN.fullTime);
  const m = await measure(page);
  console.log(`308px FT: ${JSON.stringify(m)}`);
  expect(m.riverTop).toBeGreaterThanOrEqual(m.meterBottom);
  expect(m.riverRight).toBeLessThanOrEqual(m.hudRight);
  expect(m.partOverlap).toBeLessThanOrEqual(0);
  expect(m.chartWidth).toBeGreaterThanOrEqual(36);
  expect(m.pageScrolls).toBe(false);
});
