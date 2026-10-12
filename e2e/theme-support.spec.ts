import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [390, 1440])
  for (const theme of ["light", "dark"] as const) {
    for (const route of [
      "/history",
      "/how-to-play",
      "/missing-theme-page",
      "/gate?error=unavailable",
    ]) {
      test(`support modules and neutral unavailable state ${route} ${width} ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(route);
        await expect(page.locator("h1")).toHaveCount(1);
        expect(await page.locator(".module-card").count()).toBeGreaterThanOrEqual(
          route === "/how-to-play" ? 8 : route === "/history" ? 2 : 1,
        );
        if (route === "/history")
          await expect(page.getByTestId("history-empty")).toHaveClass(/status-note/);
        if (route.startsWith("/gate")) {
          const input = page.getByTestId("gate-passcode");
          await expect(input).toBeVisible();
          expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(16);
          expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await expect(page.locator("main").getByRole("alert")).toHaveClass(/unavailable/);
        }
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
          .analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
    }
  }
