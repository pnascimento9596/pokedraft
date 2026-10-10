import { expect, test } from "@playwright/test";

test("a garbage share link keeps the friendly page but answers HTTP 404", async ({ page }) => {
  const res = await page.goto("/r/garbage-not-a-token");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("run-error")).toContainText("Run not found");
  await expect(page.getByRole("link", { name: "Play a new run" })).toBeVisible();
});
