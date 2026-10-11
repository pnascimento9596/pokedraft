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
import {
  PLAY_8_0,
  SHARED_RUN,
  blockCardRequests,
  draftRounds,
  ready,
  stubLeaderboard,
} from "./mobile/scenes";

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

test("a tap on a taken slot shows the swap hint on screen without a scroll, and a second tap clears it", async ({
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
  const hint = page.getByTestId("draft-hint");
  await expect(hint).toHaveText(/^Tap another slot to swap .+, or tap it again to cancel\.$/);
  await settle(page);
  expect((await inViewport(page, hint)).problem).toBeNull();
  await tapNow(page, keeper, "slot-s0 (picked to swap)");
  await expect(hint).toHaveCount(0);
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
        .withRules(["scrollable-region-focusable", "landmark-unique"])
        .analyze();
      expect(violations.map((v) => `${v.id} x${v.nodes.length}`)).toEqual([]);
    });
  }
});

// Dispatch8 short-field layout resolves the retained4-4-2 regression on all three devices.
test("at draft complete in 4-4-2, no centre-back's name touches the keeper's picture", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  await draftRounds(page, 16);
  await expect(page.getByTestId("see-results")).toBeVisible();
  await settle(page);
  const touching = await page.evaluate(() => {
    const box = (el: Element) => el.getBoundingClientRect();
    const keeper = document.querySelector('[data-testid="slot-s0"] > span')!;
    const k = box(keeper);
    const out: string[] = [];
    for (const key of ["s2", "s3"]) {
      const token = document.querySelector(`[data-testid="slot-${key}"]`)!;
      const parts = token.querySelectorAll(":scope > span");
      const name = box(parts[parts.length - 1]!);
      const gapX = Math.max(k.left - name.right, name.left - k.right);
      const gapY = Math.max(k.top - name.bottom, name.top - k.bottom);
      if (gapX < 1 && gapY < 1)
        out.push(
          `${token.getAttribute("aria-label")}: name ${Math.round(name.left)}-${Math.round(name.right)} x ${Math.round(name.top)}-${Math.round(name.bottom)}, keeper picture ${Math.round(k.left)}-${Math.round(k.right)} x ${Math.round(k.top)}-${Math.round(k.bottom)}`,
        );
    }
    return out;
  });
  expect(touching).toEqual([]);
});

for (const formation of [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "4-1-4-1",
  "5-3-2",
  "3-5-2",
  "3-4-3",
  "3-4-2-1",
]) {
  test(`warm short field: ${formation} names clear every other player picture`, async ({
    page,
  }) => {
    await start(page, PLAY_8_0.replace("f=4-4-2", `f=${formation}`));
    await draftRounds(page, 16);
    await expect(page.getByTestId("see-results")).toBeVisible();
    await settle(page);
    const collisions = await page.evaluate(() => {
      const tokens = [
        ...document.querySelectorAll('[data-testid="pitch"] [data-testid^="slot-s"]'),
      ];
      const out: string[] = [];
      for (const token of tokens) {
        const parts = token.querySelectorAll(":scope > span");
        const name = parts[parts.length - 1]!;
        const n = name.getBoundingClientRect();
        for (const other of tokens) {
          if (token === other) continue;
          const image = other.querySelector(":scope > span")!.getBoundingClientRect();
          const gapX = Math.max(image.left - n.right, n.left - image.right);
          const gapY = Math.max(image.top - n.bottom, n.top - image.bottom);
          if (gapX < 1 && gapY < 1)
            out.push(
              `${token.getAttribute("data-testid")} name touches ${other.getAttribute("data-testid")} picture`,
            );
        }
        const style = getComputedStyle(name);
        if (innerWidth >= 390 && parseFloat(style.fontSize) < 12)
          out.push(`${token.getAttribute("data-testid")} name is below12px`);
      }
      return out;
    });
    expect(collisions).toEqual([]);
  });
}
