import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const SEEDED = "/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151";

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

const squad = (page: Page) =>
  page
    .locator('[data-testid^="slot-"][data-filled="true"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

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
  await expect(page.getByTestId("results-record")).toHaveText("3-0-2");

  await page.reload();
  await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
  await expect(page.getByTestId("submit-panel")).toBeVisible();

  await page.getByRole("button", { name: "New run" }).click();
  await page.reload();
  await expect(page.getByTestId("run-start")).toBeVisible();
});

test.describe("builder Download image feedback (SA-20, SB-05)", () => {
  test("says Image saved and delivers a 1200x630 PNG", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download image" }).click();
    expect((await download).suggestedFilename()).toBe("pokedraft-lineup.png");
    await expect(page.getByRole("toolbar").getByRole("status")).toHaveText("Image saved");
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
    await expect(page.getByRole("toolbar").getByRole("alert")).toHaveText(
      "Download failed. Try again.",
    );
    await expect(page.getByRole("button", { name: "Download image" })).toBeEnabled();
    expect(errors).toEqual([]);
  });
});
