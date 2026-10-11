import { expect, test, type Locator } from "@playwright/test";
import fixture from "../scripts/audit/fixtures.json";
import { PLAY_8_0 } from "./mobile/scenes";

async function type(locator: Locator, size: number, line: number, weight?: string) {
  await expect(locator.first()).toBeVisible();
  const values = await locator.evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return {
        size: parseFloat(s.fontSize),
        line: parseFloat(s.lineHeight),
        ...(s.fontWeight ? { weight: s.fontWeight } : {}),
      };
    }),
  );
  for (const value of values) {
    expect(value.size).toBe(size);
    expect(value.line).toBe(line);
    if (weight) expect(value.weight).toBe(weight);
  }
}

for (const width of [390, 1440])
  for (const theme of ["light", "dark"] as const)
    test(`labels, pills and round buttons meet mobile type overrides ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await page.getByRole("button", { name: "Randomize", exact: true }).click();
      await type(page.locator(".type-chip"), 13, 18);
      await page.locator('[data-testid^="slot-"]').first().click();
      await type(page.getByRole("dialog").locator("button.chip"), 15, 20, "600");
      await page.goto(PLAY_8_0);
      await expect(page.getByTestId("run-start")).toBeVisible();
      await type(page.getByRole("list", { name: "Cup rounds" }).getByRole("button"), 15, 20, "600");
      await page.goto(`/r/${fixture.shareRun.token}`);
      await expect(page.getByTestId("results-score")).toHaveText("593");
      await type(page.locator(".btn--sm"), 15, 20, "600");
      if (width === 390) await type(page.locator("table thead th"), 13, 18);
      await type(page.locator('[class*="weakTag"]'), 13, 18);
    });
