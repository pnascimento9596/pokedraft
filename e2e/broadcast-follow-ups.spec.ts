import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/broadcast-follow-ups";

test.use({ hasTouch: true });

test("with reduced motion a key duel shows its cut-in, still, like the goal card at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // A duel card lives about 0.7 s at 1x. The page pauses the match in the same task that draws
  // the first one, so the card stays on screen for the checks below.
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

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-motion", "off");

  await page.waitForFunction(
    () => (window as unknown as { duelAt: number | null }).duelAt !== null,
    null,
    { timeout: 90_000 },
  );
  const duel = replay.locator('[data-testid="cut-in"][data-kind="duel"]');
  await expect(duel).toBeVisible();
  await expect(duel.locator("img")).toHaveCount(1);
  await expect
    .poll(() => duel.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await expect(duel.getByTestId("duel-callout")).toHaveText(/ (used .+|wins the tackle)!$/);
  expect(await duel.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect(replay.getByTestId("pitch-ability")).toHaveCount(0);
  const box = (await duel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  console.log(`reduced-motion duel cut-in: ${(await duel.innerText()).replace(/\n/g, " | ")}`);
  await page.screenshot({ path: `${SHOT}/390-duel-cut-in-reduced-motion.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
