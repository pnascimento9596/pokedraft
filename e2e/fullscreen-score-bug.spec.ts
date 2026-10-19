import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { draftSixteen } from "./helpers";

// Group match 1 of the golden cup8 run under engine 6 (against Goldenrod United), watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/fullscreen-score-bug";
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";

test.use({ hasTouch: true, isMobile: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

/** The pitch's on-screen box, and whether the camera's window shows all of it on the full pitch. */
function pitchBox(page: Page) {
  return page.getByTestId("broadcast").evaluate((root) => {
    const view = root.querySelector('[data-testid="pitch-view"]')!.getBoundingClientRect();
    const p = root.querySelector('[data-testid="pitch"]')!.getBoundingClientRect();
    return {
      top: p.top,
      width: p.width,
      height: p.height,
      ratio: p.width / p.height,
      inView:
        p.left >= view.left - 0.5 &&
        p.right <= view.right + 0.5 &&
        p.top >= view.top - 0.5 &&
        p.bottom <= view.bottom + 0.5,
      innerHeight,
    };
  });
}

/**
 * Every word in the scoreboard whose letters do not all sit on one line, as "word: tops". A word
 * broken in the middle ("Goldenro / d") has two different line tops.
 */
function brokenWords(page: Page) {
  return page.getByTestId("matchday-scoreboard").evaluate((board) => {
    const broken: string[] = [];
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      for (const m of text.matchAll(/\S+/g)) {
        const tops = new Set<number>();
        for (let i = m.index; i < m.index + m[0].length; i++) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          tops.add(Math.round(range.getBoundingClientRect().top));
        }
        if (tops.size > 1) broken.push(`${m[0]}: ${[...tops].join(", ")}`);
      }
    }
    return broken;
  });
}

test("pitch height <= 70svh at 844x390: the whole pitch stays in view, letterboxed (catches a landscape phone where the pitch runs off the screen)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 844, height: 390 });
  const replay = await watchLive(page);
  await replay.getByRole("button", { name: "Full pitch" }).click();
  await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-camera", "full");
  await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
  const box = await pitchBox(page);
  const sheet = await replay.getByTestId("touchline-sheet").count();
  console.log(`844x390: pitch ${JSON.stringify(box)}, sheet elements ${sheet}`);
  expect(box.innerHeight).toBe(390);
  expect(box.height).toBeLessThanOrEqual(273);
  expect(box.ratio).toBeCloseTo(1.5625, 2);
  expect(box.inView).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${SHOT}/844x390-landscape.png` });
});

test("no word break in the scoreboard at 320: every word of both names and the score sits on one line (catches 'Goldenro / d United')", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 320, height: 640 });
  const replay = await watchLive(page);
  const board = replay.getByTestId("matchday-scoreboard");
  await expect(board).toContainText("Goldenrod United");
  const broken = await brokenWords(page);
  console.log(`320 scoreboard: broken words ${JSON.stringify(broken)}`);
  expect(broken).toEqual([]);
  await board.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/320-scoreboard.png` });
});

test("score bug present only when fullscreen: the button enters and leaves full screen, the bug sits over the pitch outside the camera (catches a bug on the page, or one that zooms with the pitch)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  const replay = await watchLive(page);
  await expect(replay.getByTestId("match-player")).not.toHaveAttribute("data-minute", "0");
  const toggle = replay.getByTestId("fullscreen-toggle");
  await expect(toggle).toHaveText("Full screen");
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(replay.getByTestId("score-bug")).toHaveCount(0);
  await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390x844.png` });

  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  const bug = replay.getByTestId("score-bug");
  await expect(bug).toBeVisible();
  await expect(bug).toContainText("This squad");
  await expect(bug).toContainText("Goldenrod");
  await expect(bug).toContainText(/\d+-\d+/);
  await expect(bug).toContainText(/\d+'/);
  const where = await bug.evaluate((el) => ({
    inView: el.closest('[data-testid="pitch-view"]') !== null,
    inCamera: el.closest('[data-testid="pitch"]') !== null,
    inFullscreen: document.fullscreenElement?.contains(el) ?? false,
  }));
  expect(where).toEqual({ inView: true, inCamera: false, inFullscreen: true });
  const exit = replay.getByTestId("fullscreen-toggle");
  await expect(exit).toHaveText("Exit full screen");
  await expect(exit).toBeVisible();
  await page.screenshot({ path: `${SHOT}/390x844-fullscreen.png` });

  await exit.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(replay.getByTestId("score-bug")).toHaveCount(0);
  await expect(replay.getByTestId("fullscreen-toggle")).toHaveText("Full screen");
});

test("in manager mode at 844x390 the touchline sits in the page under a pitch no taller than 70svh, and a sub goes through; the half-time question leaves full screen (catches a landscape phone with no usable touchline, or a stop hidden behind full screen)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "live" }),
      );
  });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("broadcast")).toBeVisible();
  const sheet = page.getByTestId("touchline-sheet");
  expect(await sheet.evaluate((el) => getComputedStyle(el).display)).toBe("contents");
  await expect(page.getByTestId("sheet-toggle")).toBeHidden();
  const pitch = await pitchBox(page);
  expect(pitch.height).toBeLessThanOrEqual(273);

  const touchline = page.getByTestId("touchline");
  await touchline.scrollIntoViewIfNeeded();
  const t = (await touchline.boundingBox())!;
  const small = await touchline.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>("button, select")]
      .map((el) => ({
        id: el.dataset.testid ?? el.textContent?.trim(),
        r: el.getBoundingClientRect(),
      }))
      .filter(({ r }) => r.width > 0 && Math.min(r.width, r.height) < 44)
      .map(({ id, r }) => `${id} ${r.width}x${r.height}`),
  );
  console.log(
    `844x390 manager: pitch ${Math.round(pitch.width)}x${Math.round(pitch.height)}, touchline ${Math.round(t.width)}x${Math.round(t.height)}, small controls ${JSON.stringify(small)}`,
  );
  expect(small).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("sub-confirm").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/844x390-touchline.png` });
  await page.getByTestId("sub-confirm").tap();
  await expect(page.getByTestId("subs-count")).toHaveText("Subs 1 of 5");

  await page.getByTestId("speed-toggle").tap();
  await page.getByTestId("fullscreen-toggle").tap();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await page.screenshot({ path: `${SHOT}/844x390-fullscreen.png` });
  await expect(page.getByTestId("stop-halftime")).toBeVisible({ timeout: 60_000 });
  // Leaving full screen settles a moment after the question shows.
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});
