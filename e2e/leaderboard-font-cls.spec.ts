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
        await expect(page.getByTestId("board-row").first().getByRole("link")).toHaveAccessibleName(
          "1 WWWWWWWWWWWWWWWWWWWW 4-3-3 Squad preview unavailable. W-D-L 8-1-1 Team Score 983",
        );
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

// Fonts with different metrics wrap the middle column onto a different number of lines. On the
// Linux CI fallback, "Squad preview unavailable." fits one line and Inter needs two, so a centred
// row moved its figures 9px when Inter arrived. Growing that column directly reproduces the same
// shift on every platform, independent of which fonts the runner has.
for (const width of [360, 412, 1280])
  test(`rank, record and Team Score stay put when the middle column grows at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 823 });
    await stubLeaderboard(page, BOARD_ONE);
    await page.goto("/leaderboard");
    const row = page.getByTestId("board-row").first();
    await expect(row.getByRole("link")).toBeVisible();
    const tops = () =>
      row.evaluate((el) =>
        ["rank", "recordCol", "scoreCol"].map(
          (name) => el.querySelector(`[class*="${name}"]`)!.getBoundingClientRect().top,
        ),
      );
    const before = await tops();
    await row.evaluate((el) => {
      const extra = document.createElement("span");
      extra.textContent = "extra line";
      extra.style.display = "block";
      extra.style.lineHeight = "18px";
      el.querySelector('[class*="squad"]')!.after(extra);
    });
    expect(await tops()).toEqual(before);
  });
