import { expect, test } from "@playwright/test";
import { pngSize } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("builder Randomize fills 16 slots and the friendly cup is labelled not ranked", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Randomize" }).click();
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  await page.getByRole("button", { name: "Play a friendly cup" }).click();
  await expect(page.getByTestId("results-record")).toHaveText(/^\d-\d-\d$/);
  await expect(page.getByText("Friendly (not ranked)").first()).toBeVisible();
});

test("a bad share token shows a friendly error instead of crashing", async ({ page }) => {
  await page.goto("/r/not-a-token");
  await expect(page.getByText("This run link is broken or from an older version.")).toBeVisible();
});

test("builder Download image saves a 1200x630 PNG of the lineup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Randomize" }).click();
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  // A failed card request shows no message, so wait a bounded time instead of the test timeout.
  const download = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByRole("button", { name: "Download image" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("pokedraft-lineup.png");
  expect(await pngSize(file)).toEqual({ width: 1200, height: 630 });
});
