import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/callouts-type-effects";

test.use({ hasTouch: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

for (const width of [390, 360, 320]) {
  test(`a live goal shows the lower-third cut-in and open play shows a typed badge at ${width}px`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height: 844 });
    const replay = await watchLive(page);

    // A badge lives only for its phase, so wait for one carrying the text in a single locator.
    const badge = replay
      .getByTestId("pitch-ability")
      .filter({ hasText: / (used .+!|threads a pass!|surges forward!|wins the tackle!)$/ });
    await expect(badge.first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: `${SHOT}/${width}-callout-badge.png` });

    const goal = replay.locator('[data-testid="cut-in"][data-kind="goal"]');
    await expect(goal).toBeVisible({ timeout: 90_000 });
    await expect(goal.locator("img")).toHaveCount(1);
    await expect(goal.getByTestId("move-callout")).toHaveText(/ (used .+|shoots)!$/);
    await expect(goal.getByTestId("cut-in-type")).toBeVisible();
    const box = (await goal.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    console.log(`goal cut-in at ${width}px: ${(await goal.innerText()).replace(/\n/g, " | ")}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOT}/${width}-goal-cut-in.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("with reduced motion the goal cut-in still shows and does not animate at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const replay = await watchLive(page);
  const goal = replay.locator('[data-testid="cut-in"][data-kind="goal"]');
  await expect(goal).toBeVisible({ timeout: 90_000 });
  expect(await goal.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect(replay.getByTestId("pitch-ability")).toHaveCount(0);
  await page.screenshot({ path: `${SHOT}/390-goal-cut-in-reduced-motion.png` });
});
