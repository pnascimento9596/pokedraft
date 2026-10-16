import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const HISTORY = [
  {
    token: "pd3.e2e-lifetime-newer",
    bucket: "cup8:open",
    friendly: false,
    formation: "4-3-3",
    score: 820,
    wins: 8,
    draws: 0,
    losses: 0,
    finish: "champion",
    flawless: true,
    at: "2026-10-14T12:00:00.000Z",
  },
  {
    token: "pd3.e2e-lifetime-older",
    bucket: "kanto151",
    friendly: false,
    formation: "4-3-3",
    score: 640,
    wins: 2,
    draws: 1,
    losses: 1,
    finish: "R16",
    flawless: false,
    at: "2026-10-12T12:00:00.000Z",
  },
];

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

function metric(page: Page, label: string) {
  return page
    .getByRole("region", { name: "Lifetime totals" })
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::dd");
}

for (const width of [1280, 360]) {
  test.describe(`lifetime history at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 360 ? 780 : 900 }, reducedMotion: "reduce" });

    test("backfills once from saved runs, survives reload and round-trips a backup", async ({
      page,
    }, info) => {
      await page.addInitScript((runs) => {
        if (sessionStorage.getItem("seeded") !== null) return;
        sessionStorage.setItem("seeded", "1");
        localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
      }, HISTORY);
      await page.goto("/history");
      await expect(page.getByTestId("lifetime-backfill")).toHaveText(
        "Includes your last 2 saved runs from before lifetime tracking.",
      );
      await expect(metric(page, "Runs completed")).toHaveText("2");
      await expect(metric(page, "Cups won")).toHaveText("1");
      await expect(metric(page, "Matches W-D-L")).toHaveText("10-1-1");
      await expect(page.getByRole("region", { name: "Win rate by formation" })).toContainText(
        "10 wins / 12 matches in 2 runs",
      );
      await page.reload();
      await expect(metric(page, "Runs completed")).toHaveText("2");

      for (const name of ["Download backup", "Restore from backup"]) {
        const box = await page.getByRole("button", { name }).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
      await noOverflow(page);
      await page.screenshot({ path: `output/playwright/lifetime-history-${width}.png` });

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download backup" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^pokedraft-backup-\d{4}-\d{2}-\d{2}\.json$/);
      const file = info.outputPath("backup.json");
      await download.saveAs(file);
      const backup = JSON.parse(await readFile(file, "utf8"));
      expect(backup.format).toBe("pokedraft-backup");
      expect(backup.schemaVersion).toBe(1);
      expect(backup.history.map((run: { token: string }) => run.token)).toEqual([
        "pd3.e2e-lifetime-newer",
        "pd3.e2e-lifetime-older",
      ]);

      await page.getByTestId("backup-file").setInputFiles({
        name: "broken.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"format":"pokedraft-backup","schemaVersion":1}'),
      });
      await expect(page.getByTestId("backup-notice")).toHaveText(
        "This backup is damaged at exportedAt. Nothing was restored.",
      );

      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByTestId("history-empty")).toBeVisible();
      await expect(metric(page, "Runs completed")).toHaveText("0");
      await page.getByTestId("backup-file").setInputFiles(file);
      await expect(page.getByTestId("backup-notice")).toHaveText(
        "Backup restored. 2 new runs added to your history.",
      );
      await expect(metric(page, "Runs completed")).toHaveText("2");
      await expect(page.getByTestId("history-list").getByRole("listitem")).toHaveCount(2);
      await page.getByTestId("backup-file").setInputFiles(file);
      await expect(page.getByTestId("backup-notice")).toHaveText(
        "Backup restored. 0 new runs added to your history.",
      );
      await expect(metric(page, "Runs completed")).toHaveText("2");
      await noOverflow(page);
    });
  });
}
