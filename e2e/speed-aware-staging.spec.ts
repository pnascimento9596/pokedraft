import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live at 2x.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/speed-aware-staging";

interface Mark {
  readonly at: number;
  readonly callout: boolean;
  readonly flash: boolean;
  readonly score: string;
}

test("at 2x the first goal stages in half the time and the score lands with the ball, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as { marks: Mark[]; gone: boolean };
    w.marks = [];
    w.gone = false;
    new MutationObserver(() => {
      const score = document.querySelector('[data-testid="matchday-score"]');
      if (score === null || w.gone) return;
      const mark = {
        at: performance.now(),
        callout: document.querySelector('[data-testid="move-callout"]') !== null,
        flash: document.querySelector('[data-testid="goal-flash"]') !== null,
        score: score.textContent ?? "",
      };
      const last = w.marks.at(-1);
      if (last?.callout === mark.callout && last.flash === mark.flash && last.score === mark.score)
        return;
      if (last?.callout && !mark.callout) w.gone = true;
      w.marks.push(mark);
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await replay.getByTestId("speed-toggle").click();
  await expect(replay.getByTestId("speed-toggle")).toHaveAttribute("aria-pressed", "true");

  // The flash lives about half a second at 2x, so a visibility poll can miss it on a busy runner.
  // The page's own mutation log records every frame that drew it.
  await page.waitForFunction(
    () => (window as unknown as { marks: Mark[] }).marks.some((m) => m.flash),
    null,
    {
      timeout: 60_000,
    },
  );
  await page.screenshot({ path: `${SHOT}/390-2x-goal-landed.png` });
  await page.waitForFunction(() => (window as unknown as { gone: boolean }).gone, null, {
    timeout: 5_000,
  });

  const marks = await page.evaluate(() => (window as unknown as { marks: Mark[] }).marks);
  console.log(`2x goal staging marks: ${JSON.stringify(marks)}`);
  const shown = marks.findIndex((m) => m.callout);
  const gone = marks.findIndex((m, i) => i > shown && !m.callout);
  const flash = marks.findIndex((m) => m.flash);
  // The move callout spans 0.25 to 1 of the staging: 975 ms at 2x, 1950 ms at 1x.
  const onScreen = marks[gone]!.at - marks[shown]!.at;
  console.log(`move callout on screen for ${Math.round(onScreen)} ms`);
  expect(onScreen).toBeGreaterThan(800);
  expect(onScreen).toBeLessThan(1_300);
  expect([...new Set(marks.slice(0, flash).map((m) => m.score))]).toEqual(["0-0"]);
  expect(["1-0", "0-1"]).toContain(marks[flash]!.score);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// The 1e carryover: 2x switched on mid-goal used to jump the staging forward. The goal's callout
// shows from 0.25 to 1 of its 2,600 ms staging. Switched to 2x 300 ms after it shows, the rest
// (1,650 ms at 1x) plays in 825 ms, so it is on screen about 1,125 ms; the jump left about 650 ms.
test("2x switched on mid-goal keeps the staging where it is: the callout stays about 1,125 ms, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as {
      shown: number | null;
      toggled: number | null;
      gone: number | null;
    };
    w.shown = null;
    w.toggled = null;
    w.gone = null;
    new MutationObserver(() => {
      if (w.gone !== null) return;
      const callout = document.querySelector('[data-testid="move-callout"]') !== null;
      if (callout && w.shown === null) {
        w.shown = performance.now();
        setTimeout(() => {
          w.toggled = performance.now();
          document.querySelector<HTMLButtonElement>('[data-testid="speed-toggle"]')?.click();
        }, 300);
      } else if (!callout && w.shown !== null) w.gone = performance.now();
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { gone: number | null }).gone !== null,
    null,
    { timeout: 60_000 },
  );
  await expect(replay.getByTestId("speed-toggle")).toHaveAttribute("aria-pressed", "true");
  const { shown, toggled, gone } = await page.evaluate(() => {
    const w = window as unknown as { shown: number; toggled: number; gone: number };
    return { shown: w.shown, toggled: w.toggled, gone: w.gone };
  });
  const onScreen = gone - shown;
  console.log(
    `callout on screen ${Math.round(onScreen)} ms, 2x at ${Math.round(toggled - shown)} ms after it showed`,
  );
  expect(onScreen).toBeGreaterThan(1_000);
  expect(onScreen).toBeLessThan(1_300);
});
