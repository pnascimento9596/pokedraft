import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { draftSixteen } from "./helpers";

// Group match 3 of the golden run: your goals at 3' and 6', theirs at 10'.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/haptics";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

/**
 * Records every `navigator.vibrate` call, and makes AudioContext keep iOS Safari's autoplay rule:
 * a context created or resumed outside a tap stays suspended. Chromium under Playwright treats a
 * reload as a user activation and lets audio start, so without this a reload never locks audio.
 */
async function phone(page: Page, sound: boolean): Promise<void> {
  await page.addInitScript((on) => {
    localStorage.setItem("pokedraft:sound", JSON.stringify(on));
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem("pokedraft:panel", JSON.stringify({ matchView: "live" }));
    const w = window as unknown as {
      __buzz: unknown[];
      __chipSeen: boolean;
      __contexts: AudioContext[];
    };
    w.__buzz = [];
    w.__contexts = [];
    w.__chipSeen = false;
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: unknown) => {
        w.__buzz.push(pattern);
        return true;
      },
    });
    let tapping = false;
    for (const type of ["touchend", "pointerup", "click", "keydown"]) {
      window.addEventListener(
        type,
        (e) => {
          if (!e.isTrusted) return;
          tapping = true;
          setTimeout(() => (tapping = false), 0);
        },
        { capture: true },
      );
    }
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      locked = !tapping;
      constructor(options?: AudioContextOptions) {
        super(options);
        w.__contexts.push(this);
        this.addEventListener("statechange", () => {
          if (this.locked && this.state === "running") void super.suspend();
        });
        if (this.locked) void super.suspend();
      }
      resume() {
        if (!tapping) return new Promise<void>(() => {});
        this.locked = false;
        return super.resume();
      }
    };
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="tap-for-sound"]') !== null) w.__chipSeen = true;
    }).observe(document, { childList: true, subtree: true });
  }, sound);
}

const buzzes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __buzz: unknown[] }).__buzz);
const audioState = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __contexts: AudioContext[] }).__contexts.at(-1)?.state ?? null,
  );
const chipSeen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __chipSeen: boolean }).__chipSeen);

async function watchG3(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G3").getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

test("Watch live buzzes once per user goal, never for the opponent's, and once at the final whistle", async ({
  page,
}) => {
  await phone(page, true);
  const replay = await watchG3(page);
  const toggle = replay.getByTestId("sound-toggle");
  await expect(toggle).toHaveText("Sound and haptics on");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(replay.getByTestId("haptics-hint")).toHaveText(
    "Haptics work on Android phones only.",
  );
  await expect(replay.getByTestId("matchday-score")).toHaveText("2 - 1", { timeout: 60_000 });
  await page.screenshot({ path: `${SHOT}/toggle-390.png` });
  expect(await buzzes(page)).toEqual([[120], [120]]);

  await replay.getByTestId("skip-ft").tap();
  await expect(replay.getByTestId("match-player")).toHaveAttribute("data-stage", "done");
  await expect.poll(() => buzzes(page)).toEqual([[120], [120], [400]]);
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await replay.getByTestId("sound-toggle").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/toggle-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("with Sound and haptics off Watch live never buzzes", async ({ page }) => {
  await phone(page, false);
  const replay = await watchG3(page);
  await expect(replay.getByTestId("sound-toggle")).toHaveText("Sound and haptics off");
  await expect(replay.getByTestId("matchday-score")).toHaveText("2 - 1", { timeout: 60_000 });
  await replay.getByTestId("skip-ft").tap();
  await expect(replay.getByTestId("match-player")).toHaveAttribute("data-stage", "done");
  expect(await buzzes(page)).toEqual([]);
});

test("tap-for-sound chip appears after reload and disappears after the first tap", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await phone(page, true);
  await page.goto(PLAY);
  await page.getByTestId("run-start").tap();
  await draftSixteen(page);
  await page.getByTestId("see-results").tap();
  await expect(page.getByTestId("prematch")).toBeVisible();
  expect(await chipSeen(page)).toBe(false);

  await page.reload();
  await expect(page.getByTestId("prematch")).toBeVisible();
  await expect.poll(() => audioState(page)).toBe("suspended");
  const chip = page.getByTestId("tap-for-sound");
  await expect(chip).toHaveText("Tap for sound");
  const box = await chip.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOT}/tap-for-sound-390.png` });

  await page.getByTestId("matchday-title").tap();
  await expect(chip).toHaveCount(0);
  expect(await audioState(page)).toBe("running");
  await page.getByTestId("prematch-go").tap();
  await expect(page.getByTestId("match-player")).toBeVisible();
  await expect(page.getByTestId("sound-toggle")).toHaveText("Sound and haptics on");
  await expect(chip).toHaveCount(0);
});
