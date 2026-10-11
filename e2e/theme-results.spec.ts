import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SHARED_RUN } from "./mobile/scenes";

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`warm results use titled modules and restrained figures at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(`/r/${SHARED_RUN}`);
      await expect(page.getByTestId("results-score")).toHaveText("593");
      await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const modules = page.locator('[data-testid="results"] .module-card');
      expect(await modules.count()).toBeGreaterThanOrEqual(5);
      const header = modules.first().locator(":scope > header");
      await expect(header.getByTestId("results-score")).toBeVisible();
      await expect(header.getByTestId("results-record")).toBeVisible();
      const styles = await page.getByTestId("results-score").evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          size: parseFloat(s.fontSize),
          weight: s.fontWeight,
          numbers: s.fontVariantNumeric,
        };
      });
      expect(styles).toEqual({
        size: width === 390 ? 32 : 28,
        weight: "600",
        numbers: "tabular-nums",
      });
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => `${v.id} x${v.nodes.length}`)).toEqual([]);
    });
  }
}
