import { expect, test } from "@playwright/test";

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
