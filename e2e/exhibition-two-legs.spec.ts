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
      const modal = page.getByTestId("exhibition-modal");
      const format = modal.getByRole("group", { name: "Exhibition format" });
      await expect(format.getByRole("button", { name: "One match" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(modal.getByTestId("exhibition-score")).toHaveText(PIN.firstSingle);
      for (const button of await format.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }

      await format.getByRole("button", { name: "Two legs" }).click();
      // The first rematch of this mirror whose tie reaches extra time comes from the engine.
      for (let rematch = 0; rematch < PIN.extraTimeRematch; rematch++) {
        await modal.getByRole("button", { name: "Play rematch" }).click();
      }
      await expect(modal.getByTestId("exhibition-leg-1-score")).toHaveText(PIN.extraTime.leg1);
      await expect(modal.getByTestId("exhibition-leg-2-score")).toHaveText(PIN.extraTime.leg2);
      await expect(modal.getByTestId("exhibition-aggregate")).toHaveText(PIN.extraTime.aggregate);
      await expect(modal.getByTestId("exhibition-decided")).toHaveText("After extra time");
      const leg2 = modal.getByRole("region", { name: "Leg 2" });
      await expect(leg2.getByRole("status")).toHaveText("Leg 2 after extra time.");
      await expect(leg2.getByRole("list", { name: "Leg 2 goals" })).toContainText(
        PIN.extraTime.goal,
      );

      await leg2.getByRole("button", { name: "Replay highlights" }).click();
      await expect(modal.getByTestId("exhibition-aggregate")).toHaveCount(0);
      await expect(modal.getByRole("region", { name: "Aggregate" })).toHaveText(
        "The aggregate shows when both legs are at full time.",
      );
      await expect(leg2.getByRole("status")).toContainText("/ 120' Replay of recorded goals.");
      await leg2.getByRole("button", { name: "Show full time" }).click();
      await expect(modal.getByTestId("exhibition-aggregate")).toHaveText(PIN.extraTime.aggregate);
      await noOverflow(page);
      await page.screenshot({ path: `output/playwright/two-leg-exhibition-${width}.png` });

      await format.getByRole("button", { name: "One match" }).click();
      await expect(modal.getByTestId("exhibition-score")).toHaveText(PIN.singleAtExtraTimeRematch);
      await format.getByRole("button", { name: "Two legs" }).click();
      for (let rematch = PIN.extraTimeRematch; rematch < PIN.aggregateRematch; rematch++) {
        await modal.getByRole("button", { name: "Play rematch" }).click();
      }
      await expect(modal.getByTestId("exhibition-aggregate")).toHaveText(PIN.aggregate);
      await expect(modal.getByTestId("exhibition-decided")).toHaveText("On aggregate");

      expect(await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"))).toBe(history);
      expect(await page.evaluate(() => localStorage.getItem("pokedraft:lifetime:v1"))).toBe(
        lifetime,
      );
    });
  });
}
