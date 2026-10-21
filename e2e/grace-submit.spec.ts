import { expect, test } from "@playwright/test";
import { draftSixteen } from "./helpers";

test.use({ reducedMotion: "reduce" });

const GRACE_ENTRY = {
  rank: 2,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-20",
  token: "pd6.e2e-grace",
  teamScore: 845,
  wins: 4,
  draws: 0,
  losses: 1,
  createdAt: "2026-10-21T12:00:00.000Z",
  coached: false,
  engineVersion: "pokedraft-engine-6",
  seed: "e2e-seed",
  formation: "4-3-3",
};

for (const width of [390, 360, 320, 308]) {
  test(`a run the grace window accepted names its engine board, at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/leaderboard", (route) =>
      route.fulfill({ status: 201, json: { entry: GRACE_ENTRY } }),
    );
    await page.goto("/daily");
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await page.getByTestId("see-results").click();
    await page.getByTestId("submit-nickname").fill("Misty");
    await page.getByTestId("submit-button").click();

    const line = page.getByTestId("submit-grace");
    await expect(line).toHaveText("Ranked on the engine 6 board.");
    const panel = page.getByTestId("submit-panel");
    const fit = await line.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        text: Math.ceil(range.getBoundingClientRect().width),
        box: el.clientWidth,
        overflow: el.scrollWidth - el.clientWidth,
      };
    });
    test.info().annotations.push({ type: "fit", description: JSON.stringify({ width, ...fit }) });
    expect(fit.overflow).toBe(0);
    expect(fit.box - fit.text).toBeGreaterThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    if (width !== 308) {
      await panel.screenshot({ path: `docs/reports/engine-grace/submit-grace-${width}.png` });
    }
  });
}
