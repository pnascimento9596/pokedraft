import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { draftSixteen } from "./helpers";

// Group match 1 of the golden cup8 run under engine 6, watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/matchday-carryovers";
const MANAGED =
  "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";

test.use({ hasTouch: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

// The circle is clamp(36px, 9cqi, 56px): 36 on every phone, 56 on the 787.5px desktop pitch.
for (const [width, height, circle] of [
  [390, 844, 36],
  [360, 740, 36],
  [320, 640, 36],
  [1280, 720, 56],
] as const) {
  test(`cut-in sprite is not empty: the key duel's Remoraid fills its ${circle}px circle at ${width}px (catches the 80px picture box cropped to its transparent middle)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    // The page pauses the match in the same task that draws the first duel card.
    await page.addInitScript(() => {
      const w = window as unknown as { duelAt: number | null };
      w.duelAt = null;
      new MutationObserver(() => {
        if (w.duelAt !== null) return;
        if (document.querySelector('[data-testid="cut-in"][data-kind="duel"]') === null) return;
        w.duelAt = performance.now();
        document.querySelector<HTMLButtonElement>('[data-testid="play-toggle"]')?.click();
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    const replay = await watchLive(page);
    await page.waitForFunction(
      () => (window as unknown as { duelAt: number | null }).duelAt !== null,
      null,
      { timeout: 90_000 },
    );
    const duel = replay.locator('[data-testid="cut-in"][data-kind="duel"]');
    await expect(duel.getByTestId("duel-callout")).toHaveText("Remoraid used Hyper Beam!");
    await expect
      .poll(() => duel.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
    const boxes = await duel.evaluate((card) => {
      const circle = card.firstElementChild!.getBoundingClientRect();
      const picture = card.querySelector('[data-testid="player-image"]')!.getBoundingClientRect();
      const img = card.querySelector("img")!.getBoundingClientRect();
      const round = (r: DOMRect) => [r.width, r.height].map((n) => Math.round(n * 10) / 10);
      return { circle: round(circle), picture: round(picture), img: round(img) };
    });
    console.log(`${width} duel cut-in boxes: ${JSON.stringify(boxes)}`);
    expect(boxes.circle).toEqual([circle, circle]);
    expect(boxes.picture).toEqual([circle, circle]);
    expect(boxes.img[0]).toBeGreaterThan(0);
    expect(boxes.img[0]).toBeLessThanOrEqual(circle);
    expect(boxes.img[1]).toBeLessThanOrEqual(circle);
    await duel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-duel-cut-in.png` });
  });
}

for (const [width, height] of [
  [390, 844],
  [360, 740],
  [320, 640],
] as const) {
  test(`nameplate stays inside the pitch at ${width}px: the carrier's name at the left edge is not clipped (catches the nameplate cut off by the pitch's left edge)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height });
    // Pause on the first frame where the ball carrier stands in the pitch's leftmost 6%.
    await page.addInitScript(() => {
      const w = window as unknown as { edgeAt: number | null };
      w.edgeAt = null;
      const look = () => {
        if (w.edgeAt !== null) return;
        const view = document.querySelector('[data-testid="pitch-view"]');
        const carrier = document.querySelector('[data-ball] [data-testid="ball-carrier"]');
        const toggle = document.querySelector<HTMLButtonElement>('[data-testid="play-toggle"]');
        if (view !== null && carrier !== null && toggle?.textContent === "Pause") {
          const v = view.getBoundingClientRect();
          const body = carrier.parentElement!.getBoundingClientRect();
          if ((body.left + body.width / 2 - v.left) / v.width < 0.06) {
            w.edgeAt = performance.now();
            toggle.click();
            return;
          }
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    const replay = await watchLive(page);
    await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-camera", "follow");
    await page.waitForFunction(
      () => (window as unknown as { edgeAt: number | null }).edgeAt !== null,
      null,
      { timeout: 90_000 },
    );
    const fit = await replay.getByTestId("broadcast").evaluate((root) => {
      const v = root.querySelector('[data-testid="pitch-view"]')!.getBoundingClientRect();
      const p = root.querySelector('[data-testid="ball-carrier"]')!;
      const r = p.getBoundingClientRect();
      const round = (n: number) => Math.round(n * 10) / 10;
      return {
        name: p.textContent,
        left: round(r.left - v.left),
        right: round(v.right - r.right),
        top: round(r.top - v.top),
        bottom: round(v.bottom - r.bottom),
      };
    });
    console.log(`${width} nameplate at the left edge: ${JSON.stringify(fit)}`);
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeGreaterThanOrEqual(0);
    expect(fit.top).toBeGreaterThanOrEqual(0);
    expect(fit.bottom).toBeGreaterThanOrEqual(0);
    await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-nameplate-edge.png` });
  });
}

for (const [width, height] of [
  [1280, 720],
  [844, 390],
] as const) {
  test(`exit button never covers the field in full screen at ${width}x${height} (catches the button over the pitch's top right corner)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    await page.setViewportSize({ width, height });
    const replay = await watchLive(page);
    await replay.getByTestId("fullscreen-toggle").click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    const exit = replay.getByTestId("fullscreen-toggle");
    await expect(exit).toHaveAccessibleName("Exit full screen");
    const boxes = await page.evaluate(() => {
      const field = document.querySelector('[data-testid="pitch-view"]')!.getBoundingClientRect();
      const button = document
        .querySelector('[data-testid="fullscreen-toggle"]')!
        .getBoundingClientRect();
      const r = (b: DOMRect) => ({
        left: Math.round(b.left * 10) / 10,
        top: Math.round(b.top * 10) / 10,
        right: Math.round(b.right * 10) / 10,
        bottom: Math.round(b.bottom * 10) / 10,
      });
      return { field: r(field), button: r(button), innerWidth, innerHeight };
    });
    console.log(`${width}x${height} full screen: ${JSON.stringify(boxes)}`);
    const { field, button } = boxes;
    const overlaps =
      button.left < field.right &&
      button.right > field.left &&
      button.top < field.bottom &&
      button.bottom > field.top;
    expect(overlaps).toBe(false);
    expect(button.right - button.left).toBeGreaterThanOrEqual(44);
    expect(button.bottom - button.top).toBeGreaterThanOrEqual(44);
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(width);
    expect(button.top).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `${SHOT}/${width}x${height}-fullscreen.png` });
    await exit.click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(replay.getByTestId("fullscreen-toggle")).toHaveText("Full screen");
  });
}

test("Space after Kick off pauses: the keyboard lands on the play toggle (catches the focus left on the heading after Kick off)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "live" }),
      );
  });
  await page.goto(MANAGED);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  const go = page.getByTestId("prematch-go");
  await go.focus();
  await page.keyboard.press("Enter");
  const toggle = page.getByTestId("play-toggle");
  await expect(toggle).toHaveText("Pause");
  await expect(toggle).toBeFocused();
  // Paused at 0' the toggle reads "Kick off", so the first press waits for the clock to move.
  await expect(page.getByTestId("match-player")).not.toHaveAttribute("data-minute", "0");
  const scrolled = await page.evaluate(() => scrollY);
  await page.keyboard.press(" ");
  await expect(toggle).toHaveText("Resume");
  expect(await page.evaluate(() => scrollY)).toBe(scrolled);
  await page.keyboard.press(" ");
  await expect(toggle).toHaveText("Pause");
});
