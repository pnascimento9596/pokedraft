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
    await expect(roster.getByRole("img")).toHaveCount(11);
    await expect(roster.getByText("Melmetal", { exact: true })).toBeVisible();
    await expect(match.getByText(/^Captain:/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Scout / })).toHaveCount(16);
    await page.getByTestId("toggle-matchday").click();
    await page.getByTestId("broadcast-round-QF").click();
    const shootout = page.getByTestId("broadcast-shootout");
    await expect(shootout.getByRole("listitem")).toHaveCount(10);
    await expect(shootout).toContainText("Melmetal");
    await expect(shootout).not.toContainText("No. ");
    await page.getByRole("button", { name: "Replay Shootout" }).click();
    await expect(shootout.getByRole("listitem")).toHaveCount(0);
    await page.getByRole("button", { name: "Next Kick" }).click();
    await page.getByRole("button", { name: "Next Kick" }).click();
    await expect(shootout).toContainText("Melmetal");
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
