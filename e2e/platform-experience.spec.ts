import { expect, test, type Page } from "@playwright/test";
import { FORMATION_IDS } from "../src/engine/types";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";

function squad(formation = "4-3-3") {
  return `pd5.${Buffer.from(
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
    test.use({
      viewport: { width, height: width === 320 ? 568 : 900 },
      reducedMotion: "reduce",
      locale: "en-US",
      timezoneId: "UTC",
    });

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

    test("picker preserves list space and compares an actual bench swap in the dossier", async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true })),
      );
      await page.goto(`/?b=${squad()}`);
      await expect(page.getByTestId("live-lines")).toContainText("GK 1/1");
      await page.getByTestId("slot-s9").click();
      await page.getByTestId("slot-s9").click();
      const picker = page.getByRole("dialog");
      await expect(picker).toBeVisible();
      if (width === 320) {
        await page.addStyleTag({ content: "dialog header button { font-size: 17px !important; }" });
      }
      const ratio = await picker.evaluate((el) => {
        const list = el.querySelector('ul[aria-label="Species"]')!;
        return list.getBoundingClientRect().height / el.getBoundingClientRect().height;
      });
      if (width === 320) expect(ratio).toBeGreaterThan(0.5);
      await picker.getByRole("searchbox").fill("Butterfree");
      await expect(page.getByTestId("pick-12")).toContainText("Swap with SUB 1");
      await page.getByRole("button", { name: "Scout Butterfree", exact: true }).click();
      const dossier = page.getByRole("dialog").last();
      await expect(dossier.getByRole("region", { name: "Slot comparison" })).toContainText(
        "ROLE RATING",
      );
      await expect(dossier.getByRole("region", { name: "Slot comparison" })).toContainText(
        "actual placement or swap",
      );
      await expect(dossier.getByRole("region", { name: "Role fit mini pitch" })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({
        path: `output/playwright/experience-swap-${width}.png`,
        fullPage: true,
      });
    });

    test("exhibition replays genuine recorded goals without writing ranked history", async ({
      page,
    }) => {
      await page.addInitScript(
        (token) => localStorage.setItem("pokedraft.builder", JSON.stringify(token)),
        squad(),
      );
      await page.goto(`/r/${GOLDEN_CUP8_V3}`);
      const history = await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"));
      await page.getByTestId("play-exhibition").click();
      const modal = page.getByTestId("exhibition-modal");
      const final = await modal.getByTestId("exhibition-score").textContent();
      const goals = await modal.getByRole("list", { name: "Exhibition goals" }).textContent();
      await modal.getByRole("button", { name: "Replay highlights" }).click();
      await expect(modal.getByTestId("exhibition-score")).toHaveText("0-0");
      await modal.getByRole("button", { name: "Show full time" }).click();
      await expect(modal.getByTestId("exhibition-score")).toHaveText(final!);
      await expect(modal.getByRole("list", { name: "Exhibition goals" })).toHaveText(goals!);
      expect(await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"))).toBe(history);
      await noOverflow(page);
      await page.screenshot({
        path: `output/playwright/experience-exhibition-${width}.png`,
        fullPage: true,
      });
    });

    test("draft sound stays visible with a 44px target and blind numerical gating", async ({
      page,
    }) => {
      await page.goto(
        "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=experience-sound",
      );
      await page.getByTestId("run-start").click();
      await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
      const sound = page.getByRole("button", { name: "Sound off", exact: true });
      await expect(sound).toBeInViewport();
      const bounds = await sound.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      // The open picker is modal: its backdrop takes taps until the picker is minimized.
      await page.getByRole("button", { name: "Hide players" }).click();
      await sound.click();
      await expect(page.getByRole("button", { name: "Sound on", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByTestId("live-lines")).toHaveCount(0);
      await noOverflow(page);
    });

    test("leaderboard shows source squad sprites and a seeded challenge beside honest missing previews", async ({
      page,
    }) => {
      await page.route("**/api/leaderboard?**", (route) =>
        route.fulfill({
          json: {
            mode: "cup8",
            scope: "all",
            coach: "all",
            engine: "current",
            entries: [
              {
                rank: 1,
                nickname: "Known squad",
                mode: "cup8",
                variant: "open.squadFirst.g123456789",
                dailyDate: null,
                token: GOLDEN_CUP8_V3,
                teamScore: 593,
                wins: 3,
                draws: 0,
                losses: 2,
                createdAt: "2026-10-15T00:00:00Z",
                coached: false,
                engineVersion: "pokedraft-engine-6",
                seed: "e2e-seed",
                formation: "4-3-3",
                squadSpeciesIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1025],
              },
              {
                rank: 2,
                nickname: "Older squad",
                mode: "cup8",
                variant: "open.squadFirst.g123456789",
                dailyDate: null,
                token: "pd1.unavailable",
                teamScore: 500,
                wins: 2,
                draws: 0,
                losses: 3,
                createdAt: "2026-10-14T00:00:00Z",
                coached: false,
                engineVersion: "pokedraft-engine-6",
                seed: "e2e-seed",
                formation: "4-3-3",
              },
            ],
          },
        }),
      );
      await page.goto("/leaderboard?mode=cup8&scope=all");
      await expect(page.getByTestId("board-row")).toHaveCount(2);
      await expect(page.getByAltText("Pecharunt", { exact: true })).toBeVisible();
      await expect(page.getByText("Squad preview unavailable.", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Challenge this Seed: Known squad, 3-0-2", exact: true }),
      ).toHaveAttribute(
        "href",
        "/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8",
      );
      await noOverflow(page);
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
      await expect(page.getByAltText("Pikachu", { exact: true })).toBeVisible();
      await expect(page.getByText("Squad preview unavailable for this older run.")).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: "Challenge this Seed: Oct 15, 2026, 12:00\u202fAM, 3-0-2",
          exact: true,
        }),
      ).toHaveAttribute(
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
