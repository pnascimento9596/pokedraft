import { expect, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
  await page.getByRole("button", { name: "Share" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/r\/pd2\./);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  expect(await pngSize(await download)).toEqual({ width: 1200, height: 630 });

  await page.goto(link);
  await expect(page.getByTestId("results-record")).toHaveText(record);
}
