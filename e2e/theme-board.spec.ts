import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BOARD_ONE, BOARD_EMPTY, BOARD_DOWN, stubLeaderboard } from "./mobile/scenes";

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`leaderboard module rows are readable and reachable at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: theme });
      await stubLeaderboard(page, BOARD_ONE);
      await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
      const row = page.getByTestId("board-row").first();
      await expect(row).toBeVisible();
      expect(await page.locator(".module-card").count()).toBeGreaterThanOrEqual(2);
      const score = row.locator("span").filter({ hasText: /^983$/ });
      await expect(score).toHaveCount(1);
      expect(await score.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(
        width === 390 ? 13 : 12,
      );
      expect((await row.getByRole("link").boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => v.id)).toEqual([]);
    });
    test(`empty and unavailable boards use neutral reasons at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: theme });
      await stubLeaderboard(page, BOARD_EMPTY);
      await page.goto("/leaderboard");
      await expect(page.getByTestId("board-empty")).toHaveClass(/status-note/);
      await expect(page.getByTestId("board-empty")).toContainText("No entries yet");
      await page.unroute(/\/api\/leaderboard(\?|$)/);
      await stubLeaderboard(page, BOARD_DOWN);
      await page.reload();
      await expect(page.getByTestId("board-error")).toHaveClass(/status-note/);
      await expect(page.getByTestId("board-error")).toContainText("offline");
    });
  }
}
