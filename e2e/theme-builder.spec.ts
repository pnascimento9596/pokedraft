import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LINEUP =
  "pd3.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwicHJvb2Ytc3RyZXNzIixbWyJsIiw2OCwiczAiXSxbImwiLDg4OSwiczEiXSxbImwiLDEwMDcsInMyIl0sWyJsIiwyNDksInMzIl0sWyJsIiw2MzgsInM0Il0sWyJsIiw0ODMsInM1Il0sWyJsIiwxNTAsInM2Il0sWyJsIiw0ODQsInM3Il0sWyJsIiw3NDAsInM4Il0sWyJsIiwxMjksInM5Il0sWyJsIiw4MDcsInMxMCJdLFsibCIsNTIsImIwIl0sWyJsIiw1NCwiYjEiXSxbImwiLDU2LCJiMiJdLFsibCIsNTgsImIzIl0sWyJsIiw2MCwiYjQiXV1d";

for (const width of [390, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${width} ${colorScheme} ratings on`, () => {
      test.use({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme,
        reducedMotion: "reduce",
      });
      test("filled builder names include their visible ratings (SX-03)", async ({ page }) => {
        await page.addInitScript(() =>
          localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true })),
        );
        await page.goto(`/?b=${LINEUP}`);
        await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
        await page.evaluate(() => document.fonts.ready);
        const result = await new AxeBuilder({ page })
          .options({
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
            },
            rules: {
              "label-content-name-mismatch": { enabled: true },
              "image-redundant-alt": { enabled: true },
            },
          })
          .analyze();
        expect(
          result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`)),
        ).toEqual([]);
      });
    });
  }
