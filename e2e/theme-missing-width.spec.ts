import { expect, test } from "@playwright/test";
for (const theme of ["light", "dark"] as const)
  for (const route of ["/missing-theme-page", "/r/garbage-not-a-token"]) {
    test(`short missing-data module stays within 560px ${route} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(route);
      const card = page.locator(".module-card").first();
      await expect(card).toBeVisible();
      expect((await card.boundingBox())!.width).toBeLessThanOrEqual(560);
    });
  }
