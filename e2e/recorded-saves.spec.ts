import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V4 } from "../src/engine/versions/__tests__/fixtures";

// The engine-4 golden cup8 script under the live engine-5 prefix. Outcomes are identical; only the
// recorded saves are new.
const LIVE = `pd5.${GOLDEN_CUP8_V4.slice("pd4.".length)}`;

for (const width of [320, 1280]) {
  test(`recorded saves list the engine's events in results and matchday at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/r/${LIVE}`);
    await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
    const match = page.getByTestId("match-G1");
    const saves = match.getByTestId("recorded-saves");
    await saves.getByText("Recorded saves (8)", { exact: true }).click();
    const items = saves.getByRole("list", { name: "Recorded saves" }).getByRole("listitem");
    await expect(items).toHaveCount(8);
    await expect(items.first()).toHaveText("Your XI: 16' Toxtricity saves Wishiwashi's shot");
    await expect(items.last()).toHaveText("Opponent: 82' Spheal saves Tapu Koko's shot");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await saves.screenshot({ path: `output/playwright/recorded-saves/results-${width}.png` });
    await match.getByTestId("watch-live").click();
    const replay = page.getByTestId("match-replay");
    await replay.getByTestId("skip-ft").click();
    const feed = replay.getByTestId("ticker").locator('li[data-kind="save"]');
    await expect(feed).toHaveCount(8);
    await expect(feed.first()).toContainText("82'");
    await expect(feed.first()).toContainText("Spheal");
    await replay.screenshot({ path: `output/playwright/recorded-saves/matchday-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("a retained engine-4 link shows no invented save list", async ({ page }) => {
  await page.goto(`/r/${GOLDEN_CUP8_V4}`);
  await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
  await expect(page.getByTestId("match-G1")).toBeVisible();
  await expect(page.getByTestId("recorded-saves")).toHaveCount(0);
});
