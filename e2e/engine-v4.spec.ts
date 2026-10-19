import { expect, test } from "@playwright/test";
import fixture from "../scripts/audit/engine-v4-fixtures.json";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";

for (const width of [320, 1280]) {
  test(`v4 Boss XI and recorded shootout identities at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/r/${fixture.token}`);
    await expect(page.getByTestId("results-record")).toHaveText("5-0-1");
    await expect(page.getByTestId("results-score")).toHaveText("943");
    const match = page.getByTestId("match-QF");
    await match.getByText("Boss XI", { exact: true }).click();
    const roster = match.getByRole("list", { name: /starting eleven/ });
    await expect(roster.getByRole("listitem")).toHaveCount(11);
    await expect(roster.locator("[data-player-image]")).toHaveCount(11);
    await expect(roster.getByText("Melmetal", { exact: true })).toBeVisible();
    await expect(match.getByText(/^Captain:/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Scout / })).toHaveCount(16);
    await match.getByTestId("watch-live").click();
    const replay = page.getByTestId("match-replay");
    await replay.getByTestId("skip-ft").click();
    const kicks = replay.getByTestId("ticker").locator('li[data-kind="kick"]');
    await expect(kicks).toHaveCount(10);
    await expect(kicks.filter({ hasText: "Melmetal" })).not.toHaveCount(0);
    await expect(kicks.filter({ hasText: "No. " })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/playwright/engine-v4/roster-${width}.png`,
      fullPage: true,
    });
  });
}

test("retained v3 presents its original contribution and shirt identities", async ({ page }) => {
  await page.goto(`/r/${GOLDEN_CUP8_V3}`);
  await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
  await expect(page.getByTestId("results-score")).toHaveText("593");
  await expect(page.getByTestId("pot-contribution")).toContainText("33.5 pts");
  await expect(page.getByTestId("match-G1")).toContainText("Opponent shirts");
});
