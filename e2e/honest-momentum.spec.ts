import { expect, test } from "@playwright/test";
import { HONEST_MOMENTUM as PIN, LIVE_GOLDEN_CUP8 } from "./pins";

// A group match of the golden cup8 run under the live prefix whose opening window has a goal or a
// save, so the bar leans once that window has been played.
const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/honest-momentum";

test("the momentum bar reads 50/50 until the first window is played, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as { leans: Record<number, string[]> };
    w.leans = {};
    new MutationObserver(() => {
      const player = document.querySelector('[data-testid="match-player"]');
      const bar = document.querySelector('[aria-label="Match momentum"]');
      if (player === null || bar === null) return;
      const minute = Number(player.getAttribute("data-minute"));
      const seen = (w.leans[minute] ??= []);
      const text = bar.textContent ?? "";
      if (!seen.includes(text)) seen.push(text);
    }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${PIN.round}`).getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await page.screenshot({ path: `${SHOT}/390-kickoff.png` });

  const player = replay.getByTestId("match-player");
  await expect
    .poll(async () => Number(await player.getAttribute("data-minute")), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(6);
  await page.screenshot({ path: `${SHOT}/390-after-first-window.png` });
  await expect
    .poll(async () => Number(await player.getAttribute("data-minute")), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(11);

  const leans = await page.evaluate(
    () => (window as unknown as { leans: Record<number, string[]> }).leans,
  );
  console.log(`momentum by minute: ${JSON.stringify(leans)}`);
  expect([0, 1, 2, 3, 4].map((m) => leans[m])).toEqual([
    [PIN.kickoff],
    [PIN.kickoff],
    [PIN.kickoff],
    [PIN.kickoff],
    [PIN.kickoff],
  ]);
  expect([6, 7, 8, 9].map((m) => leans[m])).toEqual([
    [PIN.second],
    [PIN.second],
    [PIN.second],
    [PIN.second],
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
