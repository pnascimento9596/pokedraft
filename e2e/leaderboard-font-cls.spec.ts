import { expect, test } from "@playwright/test";
import { BOARD_ONE, stubLeaderboard } from "./mobile/scenes";

for (const width of [360, 412])
  for (const theme of ["light", "dark"] as const)
    test(`late Inter swap keeps board controls and figures fixed ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 823 });
      await page.emulateMedia({ colorScheme: theme });
      await stubLeaderboard(page, BOARD_ONE);
      await page.route("**/*.woff2", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
      });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        const w = window as unknown as { __fontShifts: { value: number; nodes: string[] }[] };
        w.__fontShifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as {
            value: number;
            sources: { node?: Node }[];
          }[])
            w.__fontShifts.push({
              value: entry.value,
              nodes: entry.sources.map((s) =>
                s.node instanceof Element
                  ? s.node.outerHTML.slice(0, 300)
                  : (s.node?.textContent ?? "native input field"),
              ),
            });
        }).observe({ type: "layout-shift", buffered: true });
      });
      for (let load = 0; load < 3; load++) {
        await page.goto("/leaderboard");
        await expect(page.getByTestId("board")).toBeVisible();
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        expect(
          await page.evaluate(
            () =>
              (window as unknown as { __fontShifts: { value: number; nodes: string[] }[] })
                .__fontShifts,
          ),
        ).toEqual([]);
      }
    });
