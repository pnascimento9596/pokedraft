import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/score-lands-with-ball";

interface Snap {
  readonly score: string;
  readonly flight: boolean;
  readonly flash: boolean;
}

test("the score holds while the first goal is in flight and lands with the ball, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as { snaps: Snap[]; seenFlash: boolean };
    w.snaps = [];
    w.seenFlash = false;
    new MutationObserver(() => {
      const score = document.querySelector('[data-testid="matchday-score"]');
      if (score === null) return;
      const flash = document.querySelector('[data-testid="goal-flash"]') !== null;
      const flight = document.querySelector('[data-testid="move-callout"]') !== null && !flash;
      if (w.seenFlash && !flash) return;
      w.seenFlash ||= flash;
      const snap = { score: score.textContent ?? "", flight, flash };
      const last = w.snaps.at(-1);
      if (last?.score !== snap.score || last.flight !== flight || last.flash !== flash) {
        w.snaps.push(snap);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await expect(replay.getByRole("status")).toHaveText("0 - 0");

  await expect(replay.getByTestId("move-callout")).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: `${SHOT}/390-goal-in-flight.png` });
  await expect(replay.getByTestId("goal-flash")).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: `${SHOT}/390-goal-landed.png` });
  await expect(replay.getByTestId("goal-flash")).toBeHidden({ timeout: 5_000 });

  const snaps = await page.evaluate(() => (window as unknown as { snaps: Snap[] }).snaps);
  console.log(`score snapshots to the first goal: ${JSON.stringify(snaps)}`);
  const inFlight = [...new Set(snaps.filter((s) => s.flight).map((s) => s.score))];
  const landed = [...new Set(snaps.filter((s) => s.flash).map((s) => s.score))];
  expect(inFlight).toEqual(["0 - 0"]);
  expect(landed.length).toBe(1);
  expect(["1 - 0", "0 - 1"]).toContain(landed[0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
