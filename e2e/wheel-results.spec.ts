import { expect, test, type Page } from "@playwright/test";

async function expectResultsInWindows(page: Page) {
  const results = page.getByTestId("wheel-result");
  await expect(results).toHaveCount(2);
  for (const result of await results.all()) {
    await expect
      .poll(() =>
        result.evaluate((face) => {
          const r = face.getBoundingClientRect();
          const window = face.parentElement!.parentElement!.getBoundingClientRect();
          return r.top >= window.top && r.bottom <= window.bottom;
        }),
      )
      .toBe(true);
  }
}

for (const width of [390, 1440]) {
  test.describe(`wheel results at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const finish of ["natural", "skip", "reduced"] as const) {
      test(`${finish} results stay in the windows until the next pick and spin`, async ({
        page,
      }) => {
        await page.emulateMedia({
          reducedMotion: finish === "reduced" ? "reduce" : "no-preference",
        });
        await page.goto(
          "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-rr",
        );
        await page.getByTestId("run-start").click();
        if (finish === "skip") {
          const spinning = page.locator('[data-testid="wheel"][data-state="spinning"]');
          await expect
            .poll(() =>
              spinning
                .locator('[aria-hidden="true"]:has(> [data-kind])')
                .evaluate((reel) => (reel as HTMLElement).style.transform),
            )
            .toMatch(/-[1-9]/);
          await page.getByRole("button", { name: "Tap to skip" }).click();
        }
        await expect(page.getByTestId("wheel-result")).toHaveCount(2, { timeout: 10_000 });
        await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
        await expect(page.getByTestId("wheel-result")).toHaveText(["Johto", "Fire"]);
        await expectResultsInWindows(page);

        await page.locator('[data-testid^="candidate-"]').first().click();
        await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
        await expect(page.getByTestId("wheel-result")).toHaveText(["Johto", "Fire"]);
        await expectResultsInWindows(page);

        await page
          .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
          .first()
          .click();
        await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
        await expect(page.getByTestId("wheel-result")).toHaveCount(2, { timeout: 10_000 });
        await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
        await expectResultsInWindows(page);
      });
    }
  });
}
