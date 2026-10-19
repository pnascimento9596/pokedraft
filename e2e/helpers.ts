import { expect, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { SHARE_LINK } from "./pins";

/** Skips a manager-mode match to full time, through the warning that the assistant answers the rest. */
export async function skipManaged(page: Page): Promise<void> {
  await page.getByTestId("skip-ft").click();
  await page.getByTestId("skip-confirm").click();
}

export async function draftSixteen(page: Page): Promise<void> {
  const header = page.getByTestId("round-header");
  for (let round = 1; round <= 16; round++) {
    await expect(header).toContainText(`Round ${round} of 16`);
    await page.locator('[data-testid^="candidate-"]').first().click();
    await page
      .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
      .first()
      .click();
  }
  await expect(page.getByTestId("see-results")).toBeVisible();
}

export async function pngSize(download: Download): Promise<{ width: number; height: number }> {
  const path = await download.path();
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export async function shareAndReplay(page: Page, record: string): Promise<void> {
  await expect(page.getByTestId("results-record")).toHaveText(record);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(SHARE_LINK);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  expect(await pngSize(await download)).toEqual({ width: 1200, height: 630 });

  await page.goto(link);
  await expect(page.getByTestId("results-record")).toHaveText(record);
}

// Home settings start collapsed below 1024px. A tap before hydration does nothing, so this taps
// until Formation shows, and taps nothing once they are open.
export async function openHomeSettings(page: Page): Promise<void> {
  const collapsed = page.getByRole("button", { name: "Settings and records", exact: true });
  await expect(async () => {
    if (await collapsed.isVisible()) await collapsed.click();
    await expect(page.getByLabel("Formation")).toBeVisible({ timeout: 1_000 });
  }).toPass();
}
