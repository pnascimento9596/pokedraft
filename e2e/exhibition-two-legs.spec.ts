import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";
import { MIRROR_EXHIBITION as PIN } from "./pins";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

// The shared run's own squad, saved as the Builder squad, so the exhibition is a mirror match.
async function saveMirrorSquad(page: Page): Promise<void> {
  await page.goto(`/r/${GOLDEN_CUP8_V3}`);
  const href = await page.getByTestId("open-in-builder").getAttribute("href");
  const mirror = new URLSearchParams(href!.slice(2)).get("b")!;
  await page.evaluate((t) => localStorage.setItem("pokedraft.builder", JSON.stringify(t)), mirror);
  await page.reload();
}

// Manager mode is off by default, so Skip to full time ends each match at once.
async function playMatch(page: Page): Promise<void> {
  await page.getByTestId("exhibition-kickoff").click();
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("exhibition-fulltime")).toBeVisible();
}

async function playTie(page: Page): Promise<void> {
  await playMatch(page);
  await page.getByRole("button", { name: "Play leg 2" }).click();
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("exhibition-aggregate")).toBeVisible();
}

for (const width of [1280, 360]) {
  test.describe(`two-leg exhibition at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 360 ? 780 : 900 }, reducedMotion: "reduce" });

    test("a level aggregate goes to extra time in leg 2 and nothing reaches history", async ({
      page,
    }) => {
      await saveMirrorSquad(page);
      const history = await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"));
      const lifetime = await page.evaluate(() => localStorage.getItem("pokedraft:lifetime:v1"));
      await page.getByTestId("play-exhibition").click();
      await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}`);
      const main = page.getByRole("main");
      await expect(main.getByTestId("exhibition-mirror")).toHaveText("Same squad on both sides");
      const format = main.getByRole("group", { name: "Exhibition format" });
      await expect(format.getByRole("button", { name: "One match" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await playMatch(page);
      await expect(main.getByTestId("exhibition-score")).toHaveText(PIN.firstSingle);
      for (const button of await format.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }

      await format.getByRole("button", { name: "Two legs" }).click();
      await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}&legs=2`);
      await playTie(page);
      await main.getByRole("button", { name: "Play rematch" }).click();
      await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}&n=1&legs=2`);

      // The first rematch of this mirror whose tie reaches extra time comes from the engine.
      await page.goto(`/exhibition?away=${GOLDEN_CUP8_V3}&n=${PIN.extraTimeRematch}&legs=2`);
      await page.getByTestId("exhibition-kickoff").click();
      await page.getByTestId("skip-ft").click();
      await expect(main.getByTestId("exhibition-leg-1-score")).toHaveText(PIN.extraTime.leg1);
      await main.getByRole("button", { name: "Play leg 2" }).click();
      await page.getByTestId("skip-ft").click();
      await expect(main.getByTestId("exhibition-leg-1-score")).toHaveText(PIN.extraTime.leg1);
      await expect(main.getByTestId("exhibition-leg-2-score")).toHaveText(PIN.extraTime.leg2);
      await expect(main.getByTestId("exhibition-aggregate")).toHaveText(PIN.extraTime.aggregate);
      await expect(main.getByTestId("exhibition-decided")).toHaveText("After extra time");
      await expect(main.getByTestId("exhibition-fulltime")).toContainText(
        "Level on aggregate after 90 minutes, so leg 2 went to extra time.",
      );
      await expect(main.getByRole("list", { name: "Extra time goals" })).toContainText(
        PIN.extraTime.goal,
      );
      await noOverflow(page);
      await page.screenshot({ path: `output/playwright/two-leg-exhibition-${width}.png` });

      await format.getByRole("button", { name: "One match" }).click();
      await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}&n=${PIN.extraTimeRematch}`);
      await playMatch(page);
      await expect(main.getByTestId("exhibition-score")).toHaveText(PIN.singleAtExtraTimeRematch);

      await page.goto(`/exhibition?away=${GOLDEN_CUP8_V3}&n=${PIN.aggregateRematch}&legs=2`);
      await playTie(page);
      await expect(main.getByTestId("exhibition-aggregate")).toHaveText(PIN.aggregate);
      await expect(main.getByTestId("exhibition-decided")).toHaveText("On aggregate");

      expect(await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"))).toBe(history);
      expect(await page.evaluate(() => localStorage.getItem("pokedraft:lifetime:v1"))).toBe(
        lifetime,
      );
    });
  });
}
