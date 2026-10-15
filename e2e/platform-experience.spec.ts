import { expect, test, type Page } from "@playwright/test";
import { FORMATION_IDS } from "../src/engine/types";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";

function squad(formation = "4-3-3") {
  return `pd4.${Buffer.from(
    JSON.stringify([
      ["b", formation, "123456789", 1],
      "experience-proof",
      Array.from({ length: 16 }, (_, index) => [
        "l",
        index + 1,
        index < 11 ? `s${index}` : `b${index - 11}`,
      ]),
    ]),
  ).toString("base64url")}`;
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [1280, 320]) {
  test.describe(`platform experience at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 568 : 900 }, reducedMotion: "reduce" });

    test("filled formations retain visible tactical labels and scout all sixteen players", async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true })),
      );
      for (const formation of FORMATION_IDS) {
        await page.goto(`/?b=${squad(formation)}`);
        await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
        const labels = page.locator('[data-testid^="slot-"] [id$="-slot"]');
        await expect(labels).toHaveCount(16);
        for (const label of await labels.all()) await expect(label).toBeVisible();
        await noOverflow(page);
      }
      await page.getByText("Scout squad (16)", { exact: true }).click();
      const scouts = page.getByRole("button", { name: /^Scout .* at / });
      await expect(scouts).toHaveCount(16);
      expect(
        await scouts.first().evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      await scouts.last().click();
      await expect(page.getByRole("region", { name: "Role fit mini pitch" })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({
        path: `output/playwright/experience-scout-${width}.png`,
        fullPage: true,
      });
    });

    test("chemistry reasons filter actual adjacent links and blind drafting hides line ratings", async ({
      page,
    }) => {
      await page.goto(`/?b=${squad()}`);
      await expect(page.getByTestId("live-lines")).toHaveCount(0);
      await page.getByText(/^Chemistry links \(/).click();
      const group = page.getByRole("group", { name: "Filter chemistry links by reason" });
      await expect(group).toBeVisible();
      for (const button of await group.getByRole("button").all()) {
        expect(
          await button.evaluate((el) => el.getBoundingClientRect().height),
        ).toBeGreaterThanOrEqual(44);
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      await noOverflow(page);
    });

    test("stored career exposes all species, truthful unknown coverage, formation rates and challenge previews", async ({
      page,
    }) => {
      await page.addInitScript((token) => {
        const base = {
          bucket: "cup8:open",
          friendly: false,
          formation: "4-3-3",
          score: 593,
          wins: 3,
          draws: 0,
          losses: 2,
          finish: "QF",
          flawless: false,
          at: "2026-10-15T00:00:00Z",
        };
        localStorage.setItem(
          "pokedraft:history:v1",
          JSON.stringify([
            { ...base, token, squadSpeciesIds: [1, 25, 1025] },
            { ...base, token: "old-unknown" },
          ]),
        );
      }, GOLDEN_CUP8_V3);
      await page.goto("/history");
      const hall = page.getByRole("region", { name: "Species Hall of Fame" });
      await expect(hall).toContainText("Browse all 1,025 species");
      await expect(hall).toContainText("Squad coverage: 1 of 2 ranked stored runs");
      await expect(page.getByRole("region", { name: "Win rate by formation" })).toContainText(
        "60.0%",
      );
      await hall.getByRole("searchbox").fill("1025");
      await expect(hall).toContainText("#1025 Pecharunt");
      await expect(hall).toContainText("1 drafted squad, 0 champion squads");
      await expect(page.getByAltText("Squad species 25")).toBeVisible();
      await expect(page.getByText("Squad preview unavailable for this older run.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Challenge this Seed" })).toHaveAttribute(
        "href",
        "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8",
      );
      await noOverflow(page);
      await page.screenshot({
        path: `output/playwright/experience-history-${width}.png`,
        fullPage: true,
      });
    });
  });
}
