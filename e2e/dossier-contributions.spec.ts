import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/dossier-contributions";
const POSITION_FIRST =
  "/play?mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=cap-0";
const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 568 },
];

test.use({ hasTouch: true, isMobile: true, reducedMotion: "reduce" });

async function ratings(page: Page, on: boolean): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem(
      "pokedraft:panel",
      JSON.stringify({ showRatings: value, showChallengeRatings: value }),
    );
  }, on);
}

const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("Snorlax dossier shows literal ability, move and review contributions under affected attribute bars", async ({
      page,
    }) => {
      await ratings(page, true);
      await page.goto("/");
      await page.getByRole("button", { name: /^Empty LCB slot/ }).tap();
      const picker = page.getByRole("dialog", { name: "Pick for LCB" });
      await picker.getByRole("searchbox").fill("snorlax");
      await picker.getByRole("button", { name: "Scout Snorlax" }).tap();

      const dossier = page.getByRole("dialog", { name: "Snorlax" });
      await expect(dossier).toBeVisible();
      await expect(dossier.getByTestId("attr-abilities-ACC")).toHaveText("Abilities -2");
      await expect(dossier.getByTestId("attr-abilities-PHY")).toHaveText("Abilities +3");
      await expect(dossier.getByTestId("attr-moves-SHO")).toHaveText("Moves +1.75");
      await expect(dossier.getByTestId("attr-moves-DRI")).toHaveText("Moves +0.5");
      await expect(dossier.getByTestId("attr-moves-TEC")).toHaveText("Moves +0.75");
      await expect(dossier.getByTestId("attr-moves-AER")).toHaveText("Moves +3");
      await expect(dossier.getByTestId("attr-moves-KIC")).toHaveText("Moves +1");
      await expect(dossier.getByTestId("attr-review-STA")).toHaveText("Review -6");
      await expect(dossier.getByTestId("attr-review-GKP")).toHaveText("Review +6");
      await expect(dossier.getByTestId("attr-contributions-note")).toHaveText(
        "Abilities and moves are contributions to the baseline. Review is the scout adjustment before the 1 to 99 clamp.",
      );
      expect(await fitsWidth(page)).toBe(true);

      const attrsSection = dossier.getByRole("region", { name: "Soccer attributes" });
      await attrsSection.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${SHOT}/dossier-snorlax-${size.width}.png` });
    });

    test("draft dossier shows contributions with ratings on and hides them when ratings are off", async ({
      page,
    }) => {
      await ratings(page, true);
      await page.goto(POSITION_FIRST);
      await page.getByTestId("run-start").click();
      await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
      await page.getByTestId("slot-s0").tap();
      await page.getByRole("button", { name: "Scout Dewott" }).tap();

      const dossier = page.getByRole("dialog", { name: "Dewott" });
      await expect(dossier.getByTestId("attr-abilities-DEF")).toHaveText("Abilities +1");
      await expect(dossier.getByTestId("attr-abilities-PHY")).toHaveText("Abilities +1.5");
      await expect(dossier.getByTestId("attr-moves-DIV")).toHaveText("Moves +0.75");
      await expect(dossier.getByTestId("attr-moves-HAN")).toHaveText("Moves +0.5");
      await expect(dossier.getByTestId("attr-moves-REF")).toHaveText("Moves +1");
      await expect(dossier.getByTestId("attr-review-TEC")).toHaveText("Review +3");
      await expect(dossier.getByTestId("attr-contributions-note")).toBeVisible();
      expect(await fitsWidth(page)).toBe(true);
    });

    test("blind challenge mode hides ability, move and review contributions", async ({ page }) => {
      await ratings(page, false);
      await page.goto(POSITION_FIRST);
      await page.getByTestId("run-start").click();
      await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
      await page.getByTestId("slot-s0").tap();
      await page.getByRole("button", { name: "Scout Dewott" }).tap();

      const dossier = page.getByRole("dialog", { name: "Dewott" });
      await expect(dossier.getByRole("region", { name: "Soccer attributes" })).toContainText(
        "Numeric 1 to 99 attributes are hidden while blind challenge ratings are off.",
      );
      await expect(dossier.getByTestId("attr-abilities-DEF")).toHaveCount(0);
      await expect(dossier.getByTestId("attr-moves-DIV")).toHaveCount(0);
      await expect(dossier.getByTestId("attr-review-TEC")).toHaveCount(0);
      await expect(dossier.getByTestId("attr-contributions-note")).toHaveCount(0);
      expect(await fitsWidth(page)).toBe(true);

      await dossier
        .getByRole("region", { name: "Soccer attributes" })
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${SHOT}/dossier-blind-${size.width}.png` });
    });
  });
}

test("at 308x568 Snorlax dossier contributions fit without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 308, height: 568 });
  await ratings(page, true);
  await page.goto("/");
  await page.getByRole("button", { name: /^Empty LCB slot/ }).tap();
  const picker = page.getByRole("dialog", { name: "Pick for LCB" });
  await picker.getByRole("searchbox").fill("snorlax");
  await picker.getByRole("button", { name: "Scout Snorlax" }).tap();

  const dossier = page.getByRole("dialog", { name: "Snorlax" });
  await expect(dossier.getByTestId("attr-abilities-PHY")).toHaveText("Abilities +3");
  await expect(dossier.getByTestId("attr-moves-SHO")).toHaveText("Moves +1.75");
  const attrsSection = dossier.getByRole("region", { name: "Soccer attributes" });
  await attrsSection.evaluate((el) => el.scrollIntoView({ block: "start" }));

  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('[data-testid="scouting-dossier"]')!;
    const grid = dialog.querySelector<HTMLElement>('[aria-label="Soccer attributes"]')!;
    return {
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialogOverflow: dialog.scrollWidth - dialog.clientWidth,
      gridOverflow: grid.scrollWidth - grid.clientWidth,
      dialogClientWidth: dialog.clientWidth,
    };
  });
  expect(metrics.docOverflow).toBeLessThanOrEqual(0);
  expect(metrics.dialogOverflow).toBeLessThanOrEqual(0);
  expect(metrics.gridOverflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOT}/dossier-snorlax-308.png` });
});
