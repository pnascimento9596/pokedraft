import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`Hall of Fame controls use a legible themed surface and keyboard focus in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 823 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(() => {
      localStorage.setItem(
        "pokedraft:history:v1",
        JSON.stringify([
          {
            token: "history-control-fixture",
            bucket: "cup8:open",
            friendly: false,
            formation: "4-3-3",
            score: 820,
            wins: 8,
            draws: 0,
            losses: 0,
            finish: "champion",
            flawless: true,
            at: "2026-10-14T12:00:00Z",
          },
        ]),
      );
    });
    await page.goto("/history");
    const search = page.getByRole("searchbox", { name: "Find a Hall of Fame species" });
    const filter = page.getByRole("combobox", { name: "Filter Hall of Fame species" });
    await expect(filter).toBeVisible();
    for (const field of [search, filter]) {
      await expect(field).toHaveCSS("font-size", "16px");
      expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const colors = await field.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--surface)";
        element.parentElement!.append(probe);
        const surface = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { actual: getComputedStyle(element).backgroundColor, surface };
      });
      expect(colors.actual).toBe(colors.surface);
    }
    await search.focus();
    await page.keyboard.press("Tab");
    await expect(filter).toBeFocused();
    await expect(filter).toHaveCSS("outline-style", "solid");
    await expect(filter).toHaveCSS("outline-width", "2px");
    const contrast = await new AxeBuilder({ page })
      .include('section[aria-label="Species Hall of Fame"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(contrast.violations).toEqual([]);
  });
}
