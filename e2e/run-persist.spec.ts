import { expect, test, type Page } from "@playwright/test";
import { accessibleName, pngSize } from "./helpers";
import { RUN_151 } from "./pins";

test.use({ reducedMotion: "reduce" });

const SEEDED = RUN_151.url;

async function draftRounds(page: Page, from: number, to: number): Promise<void> {
  const header = page.getByTestId("round-header");
  for (let round = from; round <= to; round++) {
    await expect(header).toContainText(`Round ${round} of 16`);
    await page.locator('[data-testid^="candidate-"]').first().click();
    await page
      .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
      .first()
      .click();
  }
}

const SQUAD_AFTER_FIVE = [
  "GK Ninetales",
  "LB Nidorino",
  "LCB Sandshrew",
  "RCB Koffing",
  "RB Slowpoke",
];

const squad = async (page: Page) => {
  const names: string[] = [];
  for (const slot of await page.locator('[data-testid^="slot-"][data-filled="true"]').all()) {
    names.push(await accessibleName(slot));
  }
  return names;
};

test("a seeded run survives a reload and Back then Forward mid-draft, and its results survive a reload with the same record (SA-08, SB-06)", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto(SEEDED);
  await page.getByTestId("run-start").click();
  await draftRounds(page, 1, 5);
  await expect(page.getByTestId("round-header")).toContainText("Round 6 of 16");
  const before = await squad(page);
  expect(before).toEqual(SQUAD_AFTER_FIVE);

  await page.reload();
  await expect(page.getByTestId("round-header")).toContainText("Round 6 of 16");
  expect(await squad(page)).toEqual(SQUAD_AFTER_FIVE);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page.getByTestId("round-header")).toContainText("Round 6 of 16");
  expect(await squad(page)).toEqual(SQUAD_AFTER_FIVE);

  await draftRounds(page, 6, 16);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("results-record")).toHaveText(RUN_151.record);

  await page.reload();
  await expect(page.getByTestId("results-record")).toHaveText(RUN_151.record);
  await expect(page.getByTestId("submit-panel")).toBeVisible();

  await page.getByRole("button", { name: "New run" }).click();
  await page.reload();
  await expect(page.getByTestId("run-start")).toBeVisible();
});

test.describe("builder Download image feedback (SA-20, SB-05)", () => {
  test("on a desktop, saves pokedraft-lineup.png through the download link and says Image saved", async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, "a touch phone gets the share sheet, covered below");
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download image" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("pokedraft-lineup.png");
    expect(await pngSize(file)).toEqual({ width: 1200, height: 630 });
    await expect(
      page.getByRole("group", { name: "Builder actions" }).getByRole("status"),
    ).toHaveText("Image saved");
  });

  test("on a touch phone that can share files, hands the PNG to the share sheet and says Image shared", async ({
    page,
    hasTouch,
  }) => {
    test.skip(!hasTouch, "desktop keeps the download link");
    // Headless browsers have no share sheet to answer, so the sheet is replaced by a recorder.
    // WebKit's own canShare stays in place; Chromium has none, so it stands in for Android Chrome.
    await page.addInitScript(() => {
      const w = window as unknown as { shared: unknown[] };
      w.shared = [];
      if (typeof navigator.canShare !== "function") {
        Object.defineProperty(navigator, "canShare", { value: () => true });
      }
      Object.defineProperty(navigator, "share", {
        value: async (data: ShareData) => {
          for (const f of data.files ?? []) {
            const head = [...new Uint8Array(await f.slice(0, 8).arrayBuffer())];
            w.shared.push({ name: f.name, type: f.type, head });
          }
        },
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    await page.getByRole("button", { name: "Download image" }).click();
    await expect(
      page.getByRole("group", { name: "Builder actions" }).getByRole("status"),
    ).toHaveText("Image shared");
    expect(await page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([
      { name: "pokedraft-lineup.png", type: "image/png", head: [137, 80, 78, 71, 13, 10, 26, 10] },
    ]);
  });

  test("says Download failed in an alert when the card cannot render, with no page error", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/card?**", (route) => route.fulfill({ status: 500, body: "boom" }));
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    await page.getByRole("button", { name: "Download image" }).click();
    await expect(
      page.getByRole("group", { name: "Builder actions" }).getByRole("alert"),
    ).toHaveText("Download failed. Try again.");
    await expect(page.getByRole("button", { name: "Download image" })).toBeEnabled();
    expect(errors).toEqual([]);
  });
});
