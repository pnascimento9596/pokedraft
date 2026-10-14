import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PLAY_8_0 } from "./mobile/scenes";

for (const theme of ["light", "dark"] as const) {
  test(`expanded phone drawer keeps its toggle and instruction readable in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(PLAY_8_0);
    await page.getByTestId("run-start").click();
    await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Minimize draft picker" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .include('[data-testid="draft-drawer"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(violations.map((v) => `${v.id} x${v.nodes.length}`)).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`cup round controls stay fully visible and explain their marks at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(PLAY_8_0);
      await expect(page.getByTestId("run-start")).toBeVisible();
      const rounds = page.getByRole("list", { name: "Cup rounds" });
      await expect(rounds.getByRole("button")).toHaveCount(8);
      const problems = await rounds.evaluate((list) => {
        const clip = list.getBoundingClientRect();
        return [...list.querySelectorAll("button")].flatMap((button) => {
          const r = button.getBoundingClientRect();
          const failures: string[] = [];
          if (r.width < 44 || r.height < 44)
            failures.push(`${button.textContent}: target below 44px`);
          if (r.bottom > clip.bottom + 0.1 || r.top < clip.top - 0.1)
            failures.push(`${button.textContent}: clipped vertically`);
          if (r.right > innerWidth || r.left < 0)
            failures.push(`${button.textContent}: beyond viewport`);
          return failures;
        });
      });
      expect(problems).toEqual([]);
      await rounds.getByRole("button").first().focus();
      await expect(rounds.getByRole("tooltip").first()).toBeVisible();
      await expect(rounds.getByRole("tooltip").first()).toContainText("This run's seeded cup");
    });
  }
}
