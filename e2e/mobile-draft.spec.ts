// Dispatch 7 theme 7C on phones: the draft screen fits the viewport, the hint shows next to the
// pitch, the Picker is a bottom sheet with a list that owns most of it, and landscape keeps the
// pitch on screen. Findings SA-01, SA-03, SA-04, SA-05 and SA-09, plus the results table wrapper
// that axe flags at 320 px (scrollable-region-focusable). The flow, sheet and landscape assertions
// of GATE 4 live in e2e/mobile-acceptance.spec.ts; this spec covers what that suite does not.

import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Locator, type Page } from "@playwright/test";
import {
  inViewport,
  installIosButtonFocus,
  resizeTo,
  setColorScheme,
  settle,
  tapNow,
} from "./mobile/helpers";
import { PLAY_8_0, SHARED_RUN, blockCardRequests, ready, stubLeaderboard } from "./mobile/scenes";

const test = base.extend({
  page: async ({ page, browserName }, provide) => {
    await stubLeaderboard(page);
    await blockCardRequests(page);
    if (browserName === "webkit") await installIosButtonFocus(page);
    await provide(page);
  },
});

test.use({ reducedMotion: "reduce" });

const POSITION_FIRST =
  "/play?mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=e2e-pf";

type Rect = { top: number; bottom: number; left: number; right: number; height: number };

function rect(locator: Locator): Promise<Rect> {
  return locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
      top: round(r.top),
      bottom: round(r.bottom),
      left: round(r.left),
      right: round(r.right),
      height: round(r.height),
    };
  });
}

async function start(page: Page, url: string): Promise<void> {
  await page.goto(url);
  const go = page.getByTestId("run-start");
  await ready(page, go);
  await go.click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  await settle(page);
}

const field = (page: Page) =>
  page.getByTestId("pitch").getByRole("group", { name: "Your formation" });

test.describe("draft layout while the wheel spins", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the pitch does not move from the slot tap to the wheel to the offered players (Position First)", async ({
    page,
  }) => {
    await start(page, POSITION_FIRST);
    const before = await rect(field(page));
    const slot = page.locator('[data-testid^="slot-"][data-filled="false"]').first();
    expect((await inViewport(page, slot)).problem).toBeNull();
    await tapNow(page, slot, "an empty slot");
    await expect(page.getByTestId("wheel").first()).toBeVisible();
    const spinning = await rect(field(page));
    await page.getByRole("button", { name: "Tap to skip" }).first().click();
    const candidate = page.locator('[data-testid^="candidate-"]').first();
    await expect(candidate).toBeVisible();
    await settle(page);
    const offered = await rect(field(page));
    expect({ spinning, offered }).toEqual({ spinning: before, offered: before });
    expect((await inViewport(page, candidate)).problem).toBeNull();
    expect((await inViewport(page, page.locator("[data-highlight]"))).problem).toBeNull();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test("a tap on a taken slot shows its hint on screen without a scroll, then the hint clears", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  await page.locator('[data-testid^="candidate-"]').first().click();
  const keeper = page.getByTestId("slot-s0");
  await keeper.scrollIntoViewIfNeeded();
  await tapNow(page, keeper, "slot-s0 (empty)");
  await expect(keeper).toHaveAttribute("data-filled", "true");
  await expect(page.getByTestId("round-header")).toContainText("Round 2 of 16");
  // The player is looking at the pitch, as they would be after a scroll to reach it.
  await keeper.scrollIntoViewIfNeeded();
  await settle(page);
  await tapNow(page, keeper, "slot-s0 (taken)");
  const hint = page.getByRole("status").filter({ hasText: "That slot is taken" });
  await expect(hint).toBeVisible();
  await settle(page);
  expect((await inViewport(page, hint)).problem).toBeNull();
  await expect(hint).toHaveCount(0, { timeout: 8_000 });
});

test("the Picker is a bottom sheet with a handle, and its species list gets at least half of it", async ({
  page,
}) => {
  await page.goto("/");
  const slot = page.getByTestId("slot-s6");
  await ready(page, slot);
  await slot.scrollIntoViewIfNeeded();
  await tapNow(page, slot, "slot-s6");
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await settle(page);
  const viewport = page.viewportSize()!;
  const sheet = await rect(dialog);
  const list = await rect(dialog.getByRole("list", { name: "Species" }));
  await expect(dialog.getByTestId("sheet-handle")).toBeVisible();
  expect({
    reachesTheBottom: Math.abs(sheet.bottom - viewport.height) <= 1,
    leavesTheBackdropAbove: sheet.top >= 40,
    listShare: list.height / sheet.height >= 0.5,
  }).toEqual({ reachesTheBottom: true, leavesTheBackdropAbove: true, listShare: true });
});

test.describe("landscape", () => {
  for (const size of [
    { width: 844, height: 390 },
    { width: 750, height: 340 },
  ]) {
    test(`the draft pitch lies on its side and fits the screen height at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      test.skip(test.info().project.name !== "iphone-14", "landscape is specified for iPhone 14");
      await start(page, PLAY_8_0);
      await resizeTo(page, size);
      const r = await rect(field(page));
      expect({
        horizontal: r.right - r.left > r.height,
        fitsTheHeight: r.height <= size.height,
      }).toEqual({ horizontal: true, fitsTheHeight: true });
    });
  }
});

test.describe("scrollable regions at 320 px", () => {
  for (const scheme of ["dark", "light"] as const) {
    test(`a region that scrolls sideways can take keyboard focus (${scheme})`, async ({ page }) => {
      await page.goto(`/r/${SHARED_RUN}`);
      await ready(page, page.getByRole("button", { name: "Share", exact: true }));
      await setColorScheme(page, scheme);
      await resizeTo(page, { width: 320, height: 640 });
      const { violations } = await new AxeBuilder({ page })
        .withRules(["scrollable-region-focusable"])
        .analyze();
      expect(violations.map((v) => `${v.id} x${v.nodes.length}`)).toEqual([]);
    });
  }
});
