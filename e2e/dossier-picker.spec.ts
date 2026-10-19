import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/dossier-picker";
// Round 1 at GK offers Dewott (#502), Basculin (#550) and Tympole (#535).
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
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: value }));
  }, on);
}

const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function positionFirstGk(page: Page): Promise<void> {
  await page.goto(POSITION_FIRST);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
  await page.getByTestId("slot-s0").tap();
  await expect(page.getByTestId("candidate-502")).toBeVisible();
}

async function pickInBuilder(page: Page, slot: string, search: string, id: number) {
  await page.getByRole("button", { name: new RegExp(`^Empty ${slot} slot`) }).tap();
  const picker = page.getByRole("dialog", { name: `Pick for ${slot}` });
  await picker.getByRole("searchbox").fill(search);
  await picker.getByTestId(`pick-${id}`).tap();
  await expect(picker).toHaveCount(0);
}

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("position-first Scout opens with slot context (shows In slot: GK) and the GK radar", async ({
      page,
    }) => {
      await ratings(page, true);
      await positionFirstGk(page);
      const scout = page.getByRole("button", { name: "Scout Dewott" });
      await expect(scout).toBeVisible();
      const box = await scout.boundingBox();
      expect(box !== null && box.width >= 44 && box.height >= 44).toBe(true);
      expect(await fitsWidth(page)).toBe(true);
      await page.screenshot({ path: `${SHOT}/offers-scout-${size.width}.png` });

      await scout.tap();
      const dossier = page.getByRole("dialog", { name: "Dewott" });
      await expect(dossier.getByTestId("dossier-slot")).toContainText("In slot: GK");
      await expect(dossier.getByTestId("dossier-offer-count")).toHaveText("1 of 3");
      await expect(dossier.locator("svg[role=img] text")).toHaveText([
        "DIV",
        "REF",
        "HAN",
        "GKP",
        "KIC",
        "AER",
      ]);
      await page.screenshot({ path: `${SHOT}/dossier-gk-${size.width}.png` });

      await dossier.getByRole("button", { name: "Next offer" }).tap();
      await expect(page.getByRole("dialog", { name: "Basculin" })).toBeVisible();
      await page.getByRole("button", { name: "Compare offers" }).tap();
      await expect(page.getByTestId("dossier-compare-legend")).toHaveText(
        "Dewott (solid)Basculin (dashed)Tympole (dotted)",
      );
      await page.getByTestId("dossier-compare-legend").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/dossier-compare-${size.width}.png` });

      await page.getByTestId("close-dossier").tap();
      await expect(page.getByTestId("scouting-dossier")).toHaveCount(0);
      await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
      await page.getByTestId("candidate-502").tap();
      await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
    });
  });
}

test("Back closes only the dossier over the Picker, and a second Back closes the Picker", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Empty LCB slot/ }).tap();
  const picker = page.getByRole("dialog", { name: "Pick for LCB" });
  await picker.getByRole("searchbox").fill("pika");
  await picker.getByRole("button", { name: "Scout Pikachu" }).tap();
  await expect(page.getByRole("dialog", { name: "Pikachu" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Pikachu" })).toHaveCount(0);
  await expect(picker).toBeVisible();

  await page.goBack();
  await expect(picker).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");
});

test("builder tap A then B swaps A and B, and a second tap on A opens the Picker", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await pickInBuilder(page, "LCB", "pika", 25);
  await pickInBuilder(page, "ST", "bulba", 1);

  await page.getByTestId("slot-s2").tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("slot-s2")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("builder-swap-hint")).toHaveText(
    "Tap another player to swap, or tap again to change",
  );
  await page.screenshot({ path: `${SHOT}/builder-selected-390.png` });
  await page.getByTestId("slot-s9").tap();
  await expect(page.getByTestId("slot-s2")).toHaveAccessibleName("LCB Bulbasaur");
  await expect(page.getByTestId("slot-s9")).toHaveAccessibleName("ST Pikachu");

  await page.getByTestId("slot-s2").tap();
  await page.getByTestId("slot-s2").tap();
  await expect(page.getByRole("dialog", { name: "Pick for LCB" })).toBeVisible();
});

test("search flabebe finds Flabébé, mr mime finds Mr. Mime, farfetchd finds Farfetch'd", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Empty LCB slot/ }).tap();
  const picker = page.getByRole("dialog", { name: "Pick for LCB" });
  const search = picker.getByRole("searchbox");
  for (const [query, id] of [
    ["flabebe", 669],
    ["mr mime", 122],
    ["farfetchd", 83],
  ] as const) {
    await search.fill(query);
    await expect(picker.getByTestId(`pick-${id}`)).toBeVisible();
  }
});
