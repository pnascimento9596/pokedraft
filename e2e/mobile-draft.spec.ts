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

function rect(locator: Locator, documentCoordinates = false): Promise<Rect> {
  return locator.first().evaluate((el, inDocument) => {
    const r = el.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
      top: round(r.top + (inDocument ? scrollY : 0)),
      bottom: round(r.bottom + (inDocument ? scrollY : 0)),
      left: round(r.left),
      right: round(r.right),
      height: round(r.height),
    };
  }, documentCoordinates);
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
    const slot = page.getByTestId("slot-s0");
    await slot.scrollIntoViewIfNeeded();
    await settle(page);
    const before = await rect(field(page), true);
    expect((await inViewport(page, slot)).problem).toBeNull();
    await tapNow(page, slot, "an empty slot");
    await expect(page.getByTestId("wheel").first()).toBeVisible();
    const spinning = await rect(field(page), true);
    const candidate = page.locator('[data-testid^="candidate-"]').first();
    await expect(candidate).toBeVisible();
    await settle(page);
    const offered = await rect(field(page), true);
    expect({ spinning, offered }).toEqual({ spinning: before, offered: before });
    const highlighted = page.locator("[data-highlight]");
    await highlighted.scrollIntoViewIfNeeded();
    await settle(page);
    expect((await inViewport(page, highlighted)).problem).toBeNull();
    expect(await rect(field(page), true)).toEqual(before);
    await candidate.scrollIntoViewIfNeeded();
    await tapNow(page, candidate, "sign player for highlighted keeper");
    await expect(slot).toHaveAttribute("data-filled", "true");
    expect(await rect(field(page), true)).toEqual(before);
    const bounds = await page.evaluate(() => ({
      y: scrollY,
      max: document.documentElement.scrollHeight - innerHeight,
    }));
    expect(bounds.y).toBeGreaterThan(0);
    expect(bounds.y).toBeLessThanOrEqual(bounds.max);
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
  expect((await inViewport(page, page.getByTestId("draft-wheel"))).problem).toBeNull();
  await keeper.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await settle(page);
  await tapNow(page, keeper, "slot-s0 (taken)");
  const hint = page.getByTestId("draft-hint");
  await expect(hint).toHaveText(/^Tap another slot to swap .+, or tap it again to cancel\.$/);
  await settle(page);
  expect((await inViewport(page, hint)).problem).toBeNull();
  await tapNow(page, keeper, "slot-s0 (picked to swap)");
  await expect(hint).toHaveCount(0);
});

for (const size of [
  { width: 320, height: 568 },
  { width: 390, height: 664 },
]) {
  test(`expanded drawer leaves scrolled keeper uncovered and swap hint visible at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await start(page, PLAY_8_0);
    await resizeTo(page, size);
    expect((await inViewport(page, page.getByTestId("draft-wheel"))).problem).toBeNull();
    const candidate = page.locator('[data-testid^="candidate-"]').first();
    await candidate.scrollIntoViewIfNeeded();
    await settle(page);
    await tapNow(page, candidate, "candidate");
    const keeper = page.getByTestId("slot-s0");
    await keeper.scrollIntoViewIfNeeded();
    await tapNow(page, keeper, "place keeper");
    await expect(page.getByTestId("round-header")).toContainText("Round 2 of 16");
    await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
    await keeper.scrollIntoViewIfNeeded();
    await settle(page);
    expect((await inViewport(page, keeper)).problem).toBeNull();
    await tapNow(page, keeper, "select keeper to swap");
    await expect(page.locator('[data-testid^="candidate-"]').first()).not.toBeVisible();
    const hint = page.getByTestId("draft-hint");
    await expect(hint).toHaveText(/^Tap another slot to swap .+, or tap it again to cancel\.$/);
    expect((await inViewport(page, hint)).problem).toBeNull();
    await tapNow(page, keeper, "cancel keeper swap");
    await expect(hint).toHaveCount(0);
  });
}

test("candidate cards clear reroll buttons on phone without overlapping outlines", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  const candidates = page.locator('[data-testid^="candidate-"]');
  await expect(candidates.first()).toBeVisible();
  const rerollButtons = page.getByRole("button", { name: /^Reroll / });
  await expect(rerollButtons.first()).toBeVisible();

  const clearance = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="candidate-"]')];
    const rerolls = [...document.querySelectorAll("button")].filter((b) =>
      b.textContent?.includes("Reroll"),
    );
    const lowestCardBottom = Math.max(...cards.map((c) => c.getBoundingClientRect().bottom));
    const highestRerollTop = Math.min(...rerolls.map((r) => r.getBoundingClientRect().top));
    return highestRerollTop - lowestCardBottom;
  });

  expect(clearance).toBeGreaterThanOrEqual(0);
});

test("bench slot tags are contained inside the bench dugout without colliding with the pitch", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  const containment = await page.evaluate(() => {
    const field = document.querySelector('[data-testid="pitch"] > div:first-child')!;
    const bench = document.querySelector('[role="group"][aria-label="Bench"]')!;
    const fieldBottom = field.getBoundingClientRect().bottom;
    const benchTop = bench.getBoundingClientRect().top;
    const subSlots = [...bench.querySelectorAll('[id$="-slot"]')];
    const subTops = subSlots.map((s) => s.getBoundingClientRect().top);
    const highestSubTop = Math.min(...subTops);

    return {
      benchBelowPitch: benchTop >= fieldBottom,
      subsInsideBench: highestSubTop >= benchTop,
      benchGap: benchTop - fieldBottom,
      subInset: highestSubTop - benchTop,
    };
  });

  expect(containment.benchBelowPitch).toBe(true);
  expect(containment.subsInsideBench).toBe(true);
  expect(containment.subInset).toBeGreaterThanOrEqual(0);
});

test("round header has no focus outline and clears the rolled region and type tags", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  const roundHeader = page.getByTestId("round-header");
  await roundHeader.focus();
  await settle(page);

  const metrics = await page.evaluate(() => {
    const round = document.querySelector('[data-testid="round-header"]')!;
    const rolled = round.nextElementSibling as HTMLElement;
    const style = window.getComputedStyle(round);
    const roundRect = round.getBoundingClientRect();
    const rolledRect = rolled.getBoundingClientRect();
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
      clearance: rolledRect.top - roundRect.bottom,
    };
  });

  expect(metrics.outlineStyle === "none" || metrics.outlineWidth === 0).toBe(true);
  expect(metrics.clearance).toBeGreaterThanOrEqual(0);
});

test("open draft mode renders candidates as collectible cards with pitch border clean", async ({
  page,
}) => {
  await start(page, "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-pf");
  const candidates = page.locator('[data-testid^="candidate-"]');
  await expect(candidates.first()).toBeVisible();

  const cardStats = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-testid^="candidate-"]')];
    const pitchSection = document.querySelector<HTMLElement>('[aria-label="Your squad"]')!;
    const pitchStyle = window.getComputedStyle(pitchSection);
    return {
      count: cards.length,
      allHaveArt: cards.every((c) => c.querySelector("[data-player-image]") !== null),
      allSizedProperly: cards.every((c) => c.getBoundingClientRect().height >= 70),
      pitchBorderWidth: Number.parseFloat(pitchStyle.borderWidth) || 0,
    };
  });

  expect(cardStats.count).toBeGreaterThan(0);
  expect(cardStats.allHaveArt).toBe(true);
  expect(cardStats.allSizedProperly).toBe(true);
  expect(cardStats.pitchBorderWidth).toBe(0);
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
    test(`the scrollable draft keeps all eleven cards separate and reachable at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      test.skip(test.info().project.name !== "iphone-14", "landscape is specified for iPhone 14");
      await start(page, PLAY_8_0);
      await resizeTo(page, size);
      await page.getByRole("button", { name: "Minimize draft picker" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
      const cards = page.locator('[data-testid^="slot-s"]');
      await expect(cards).toHaveCount(11);
      const boxes = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      expect(boxes[0]!.y).toBeGreaterThan(boxes[9]!.y);
      for (const [index, a] of boxes.entries()) {
        expect(a.width).toBeGreaterThanOrEqual(44);
        expect(a.height).toBeGreaterThanOrEqual(44);
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.width).toBeLessThanOrEqual(size.width);
        for (const b of boxes.slice(index + 1)) {
          expect(
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5,
          ).toBe(false);
        }
      }
      for (const card of await cards.all()) {
        await card.scrollIntoViewIfNeeded();
        await settle(page);
        expect((await inViewport(page, card)).problem).toBeNull();
      }
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
    const keeper = document.querySelector('[data-testid="slot-s0"] [data-player-image]')!;
    const k = box(keeper);
    const out: string[] = [];
    for (const key of ["s2", "s3"]) {
      const token = document.querySelector(`[data-testid="slot-${key}"]`)!;
      const name = box(token.querySelector('[id$="-name"]')!);
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
        const name = token.querySelector('[id$="-name"]')!;
        const n = name.getBoundingClientRect();
        const ownPicture = token.querySelector("[data-player-image]")!.getBoundingClientRect();
        if (
          Math.max(ownPicture.left - n.right, n.left - ownPicture.right) < 1 &&
          Math.max(ownPicture.top - n.bottom, n.top - ownPicture.bottom) < 1
        )
          out.push(`${token.getAttribute("data-testid")} name touches its own picture`);
        for (const other of tokens) {
          if (token === other) continue;
          const image = (
            other.querySelector("[data-player-image]") ?? other.querySelector(":scope > span")!
          ).getBoundingClientRect();
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

test("tap candidate dismisses drawer, renders selection bar with suitability on empty slots, reopens via Spin results, and places on slot tap", async ({
  page,
}) => {
  await start(page, PLAY_8_0);
  const candidates = page.locator('[data-testid^="candidate-"]');
  await expect(candidates).toHaveCount(3);
  const firstCard = candidates.first();
  await firstCard.tap();

  // Drawer dismisses, selection bar appears
  const selectionBar = page.getByTestId("draft-selection-bar");
  await expect(selectionBar).toBeVisible();
  await expect(firstCard).not.toBeVisible();

  // Suitability attributes are applied to empty slots
  const recSlots = page.locator('[data-testid^="slot-"][data-suitability="recommended"]');
  expect(await recSlots.count()).toBeGreaterThan(0);

  // Reopen via "Spin results"
  await page.getByRole("button", { name: "Back to spin results" }).tap();
  await expect(firstCard).toBeVisible();
  await expect(selectionBar).toHaveCount(0);

  // Tap candidate again, dismisses drawer
  await firstCard.tap();
  await expect(selectionBar).toBeVisible();

  // Tap a recommended empty slot places candidate and advances to Round 2
  await recSlots.first().tap();
  await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
});

test("pointer drag from candidate card directly drops onto empty slot", async ({ page }) => {
  await start(page, PLAY_8_0);
  const firstCard = page.locator('[data-testid^="candidate-"]').first();
  await expect(firstCard).toBeVisible();

  const emptySlot = page.locator('[data-testid^="slot-s"][data-filled="false"]').first();
  await emptySlot.scrollIntoViewIfNeeded();

  const cardBox = (await firstCard.boundingBox())!;
  const slotBox = (await emptySlot.boundingBox())!;

  // Drag from center of candidate card to center of empty slot
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2, { steps: 5 });
  await page.mouse.up();

  // Verify placement advances round
  await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
});

test("desktop candidate selection is cleared on reroll without leaving stale suitability", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PLAY_8_0);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");

  const firstCard = page.locator('[data-testid^="candidate-"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  // Selection bar and suitability on pitch appear
  await expect(page.getByTestId("draft-selection-bar")).toBeVisible();
  const recSlots = page.locator('[data-testid^="slot-"][data-suitability="recommended"]');
  expect(await recSlots.count()).toBeGreaterThan(0);

  // Click reroll button
  const reroll = page.getByRole("button", { name: /^Reroll type/ });
  await reroll.click();

  // Selection bar and suitability highlights must be gone on new roll
  await expect(page.getByTestId("draft-selection-bar")).toHaveCount(0);
  await expect(page.locator('[data-testid^="slot-"][data-suitability]')).toHaveCount(0);
});

test("touch release over drawer does not place into occluded slots", async ({ page }) => {
  await start(page, PLAY_8_0);
  const firstCard = page.locator('[data-testid^="candidate-"]').first();
  await expect(firstCard).toBeVisible();

  const cardBox = (await firstCard.boundingBox())!;

  // Drag down slightly within drawer (e.g. 20px) and release still over drawer
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2 + 25, { steps: 5 });
  await page.mouse.up();

  // Round must NOT have advanced (remains Round 1)
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
});
