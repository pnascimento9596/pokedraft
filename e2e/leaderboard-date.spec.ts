import { expect, test } from "@playwright/test";
import { BOARD_ONE, stubLeaderboard } from "./mobile/scenes";

for (const theme of ["light", "dark"] as const)
  test(`native Date input keeps its label and editing after font readiness ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await stubLeaderboard(page, BOARD_ONE);
    await page.goto("/leaderboard");
    const date = page.getByLabel("Date", { exact: true });
    await expect(date).toBeVisible();
    await expect(date).toHaveAttribute("type", "date");
    await expect(date).toHaveAccessibleName("Date");
    await date.fill("2026-10-09");
    await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=daily&date=2026-10-09$/);
    await expect(date).toHaveValue("2026-10-09");
    await expect(date).toBeFocused();
  });
