import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/live-team-score";
const RUN_TEST = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
const CAP = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=cap-0";
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

async function start(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
}

async function pickAt(page: Page, species: number, slot: string): Promise<void> {
  await page.getByTestId(`candidate-${species}`).tap();
  await page.getByTestId(`slot-${slot}`).tap();
}

const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function shoot(page: Page, name: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOT}/${name}.png` });
}

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("ratings on: the hub shows Team Score (so far) 66 after Gulpin at ST, and Combusken shows Team Score +281", async ({
      page,
    }) => {
      await ratings(page, true);
      await start(page, RUN_TEST);
      await expect(page.getByTestId("draft-team-score")).toHaveCount(0);
      await pickAt(page, 316, "s9");
      await expect(page.getByTestId("draft-team-score")).toHaveText("Team Score (so far)66");
      await page.getByTestId("candidate-256").tap();
      await expect(page.getByTestId("draft-delta")).toHaveText("Team Score +281");
      await expect(page.getByTestId("draft-team-score")).toBeInViewport();
      expect(await fitsWidth(page)).toBe(true);
      await shoot(page, `ratings-on-${size.width}`);
    });

    test("ratings off: no scorebug and no delta, the fit glow stays", async ({ page }) => {
      await ratings(page, false);
      await start(page, RUN_TEST);
      await pickAt(page, 316, "s9");
      await page.getByTestId("candidate-256").tap();
      await expect(page.getByTestId("draft-selection-bar")).toBeVisible();
      await expect(page.getByTestId("draft-team-score")).toHaveCount(0);
      await expect(page.getByTestId("draft-delta")).toHaveCount(0);
      await expect(page.locator('[data-testid^="slot-"][data-suitability]').first()).toBeVisible();
      expect(await fitsWidth(page)).toBe(true);
      await shoot(page, `ratings-off-${size.width}`);
    });

    test("the cap warning shows at 2 legendaries when a third is selected, with ratings off", async ({
      page,
    }) => {
      await ratings(page, false);
      await start(page, CAP);
      await pickAt(page, 647, "s0");
      await pickAt(page, 1016, "s1");
      await pickAt(page, 10, "s2");
      await pickAt(page, 650, "s3");
      await page.getByTestId("candidate-642").tap();
      await expect(page.getByTestId("cap-warning")).toHaveText(
        "Last legendary or mythical slot. A third fills the cap.",
      );
      expect(await fitsWidth(page)).toBe(true);
      await shoot(page, `cap-warning-${size.width}`);
    });
  });
}

test.describe("at 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a dragged candidate shows the delta for the slot under it: Combusken over LCB is +125", async ({
    page,
  }) => {
    await ratings(page, true);
    await start(page, RUN_TEST);
    await pickAt(page, 316, "s9");
    const card = page.getByTestId("candidate-256");
    const slot = page.getByTestId("slot-s2");
    await slot.evaluate((el) => el.scrollIntoView({ block: "end", behavior: "instant" }));
    const from = (await card.boundingBox())!;
    const to = (await slot.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
    await expect(page.getByTestId("drag-delta")).toHaveText("+125");
    await page.screenshot({ path: `${SHOT}/drag-delta-390.png` });
    await page.mouse.up();
    await expect(page.getByTestId("slot-s2")).toContainText("Combusken");
  });

  test("a full draft ends on Team Score 336, the engine value, without (so far)", async ({
    page,
  }) => {
    await ratings(page, true);
    await start(page, RUN_TEST);
    const picks = [269, 256, 926, 858, 679, 655, 582, 824, 230, 835, 403, 292, 215, 185, 843, 688];
    const slots = [
      ...Array.from({ length: 11 }, (_, i) => `s${i}`),
      ...Array.from({ length: 5 }, (_, i) => `b${i}`),
    ];
    for (const [round, id] of picks.entries()) await pickAt(page, id, slots[round]!);
    await expect(page.getByTestId("round-header")).toHaveText("Draft complete");
    await expect(page.getByTestId("draft-team-score")).toHaveText("Team Score336");
    await shoot(page, "draft-complete-390");
  });
});
