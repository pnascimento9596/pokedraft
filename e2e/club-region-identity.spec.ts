import { expect, test } from "@playwright/test";
import fixture from "../scripts/audit/engine-v4-fixtures.json";

for (const width of [320, 1280]) {
  test(`verified club regions remain visible in blind results and matchday at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ showRatings: false, showChallengeRatings: false }),
      );
    });
    await page.goto(`/r/${fixture.token}`);
    await expect(page.getByTestId("results-record")).toHaveText("5-0-1");
    await expect(page.getByTestId("results-score")).toHaveText("943");
    const match = page.getByTestId("match-QF");
    await expect(match).toContainText("Santalune Town");
    await match.getByText("Boss XI", { exact: true }).click();
    const region = match.getByText("Kalos region", { exact: true });
    await expect(region).toBeVisible();
    const box = await region.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await expect(
      match.getByRole("list", { name: "Santalune Town starting eleven" }).getByRole("listitem"),
    ).toHaveCount(11);
    await page.screenshot({
      path: `output/playwright/club-region-identity/results-${width}.png`,
      fullPage: true,
    });
    await page.getByTestId("toggle-matchday").click();
    await page.getByTestId("broadcast-round-QF").click();
    const liveRoster = page
      .getByTestId("matchday-live")
      .locator("details")
      .filter({ hasText: "Kalos region" });
    await liveRoster.getByText("Boss XI", { exact: true }).click();
    await expect(liveRoster.getByText("Kalos region", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/playwright/club-region-identity/matchday-${width}.png`,
      fullPage: true,
    });
  });
}
