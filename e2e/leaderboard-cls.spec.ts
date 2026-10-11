import { expect, test } from "@playwright/test";
import { BOARD_ONE, stubLeaderboard } from "./mobile/scenes";

for (const width of [360, 390, 412])
  for (const theme of ["light", "dark"] as const)
    test(`leaderboard cold-load footer has exactly zero CLS at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 823 });
      await page.emulateMedia({ colorScheme: theme });
      await stubLeaderboard(page, BOARD_ONE);
      await page.addInitScript(() => {
        const w = window as unknown as { __boardShifts: number[] };
        w.__boardShifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number }[])
            w.__boardShifts.push(entry.value);
        }).observe({ type: "layout-shift", buffered: true });
      });
      for (let load = 0; load < 3; load++) {
        await page.goto("/leaderboard");
        await expect(page.getByTestId("board")).toBeVisible();
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        expect(
          await page.evaluate(() =>
            (window as unknown as { __boardShifts: number[] }).__boardShifts.reduce(
              (sum, value) => sum + value,
              0,
            ),
          ),
        ).toBe(0);
      }
    });
