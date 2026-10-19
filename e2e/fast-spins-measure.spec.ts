import { expect, test } from "@playwright/test";
import { draftSixteen } from "./helpers";

// A measurement, not a guard: MEASURE_FAST_SPINS=1 drafts a whole run at each speed and prints how
// long the 16 rounds took, so the time Fast saves per run can be read off the two lines.
test.skip(!process.env.MEASURE_FAST_SPINS, "measurement only, set MEASURE_FAST_SPINS=1");
test.use({ viewport: { width: 390, height: 844 } });

const RUNS = {
  cup8: "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-fast-spins",
  kanto151: "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-fast-spins",
} as const;

for (const mode of ["cup8", "kanto151"] as const) {
  for (const spinSpeed of ["normal", "fast"] as const) {
    test(`${mode} ${spinSpeed} full draft time`, async ({ page }) => {
      await page.addInitScript((speed) => {
        localStorage.setItem("pokedraft:panel", JSON.stringify({ spinSpeed: speed }));
      }, spinSpeed);
      await page.goto(RUNS[mode]);
      await page.getByTestId("run-start").click();
      const start = await page.evaluate(() => performance.now());
      await draftSixteen(page);
      const ms = (await page.evaluate(() => performance.now())) - start;
      console.log(`fast-spins measure ${mode} ${spinSpeed} ${Math.round(ms)} ms`);
      expect(ms).toBeGreaterThan(0);
    });
  }
}
