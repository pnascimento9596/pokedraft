import { expect, test } from "@playwright/test";

const SHOTS = "output/builder-matchday";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("a builder friendly with Manager mode on reaches the touchline, resumes after a reload, and stays unranked", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Randomize" }).click();
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);

  const play = page.getByRole("button", { name: "Play a friendly cup" });
  const row = play.locator("..");
  const manager = row.getByTestId("manager-mode");
  await expect(manager).toHaveAttribute("aria-checked", "false");
  await manager.click();
  await expect(manager).toHaveAttribute("aria-checked", "true");
  await row.getByTestId("match-view-live").click();
  await expect(row.getByTestId("match-view-live")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { name: /Manager mode/ })).toHaveCount(2);
  await expect(page.getByRole("switch", { name: /Manager mode/ }).first()).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/390-toggles-beside-friendly.png` });

  await play.click();
  await expect(page.getByTestId("matchday")).toHaveAttribute("data-match", "0");
  await expect(page.getByTestId("matchday")).toContainText("Match 1 · Manager mode");
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("stop-kickoff")).toBeVisible();
  await expect(page.getByTestId("touchline-minute")).toHaveText("Before kickoff");
  await page.getByTestId("tactic-attack").click();
  await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("broadcast")).toBeVisible();
  await page.getByTestId("matchday-title").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/390-friendly-touchline.png` });

  await page.reload();
  await expect(page.getByTestId("matchday")).toHaveAttribute("data-match", "0");
  await expect(page.getByTestId("matchday")).toContainText("Match 1 · Manager mode");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/390-friendly-resumed.png` });

  for (let i = 0; i < 9; i++) {
    if (await page.getByTestId("results-record").isVisible()) break;
    const pre = page.getByTestId("prematch-go");
    if (await pre.isVisible()) await pre.click();
    await page.getByTestId("skip-ft").click();
    await page.getByTestId("fulltime-next").click();
    await expect(page.getByTestId("prematch").or(page.getByTestId("results-record"))).toBeVisible();
  }
  await expect(page.getByTestId("results-record")).toHaveText(/^\d-\d-\d$/);
  await expect(page.getByText("Friendly (not ranked)").first()).toBeVisible();
  await expect(page.getByTestId("submit-panel")).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/390-friendly-results.png` });
});
