import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const CUP8 = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
const KANTO_POSITION_FIRST = "/play?mode=kanto151&f=4-3-3&order=positionFirst&seed=run-test";

async function setPanel(page: Page, panel: Record<string, unknown>): Promise<void> {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("pd-test-panel-set") === null) {
      localStorage.setItem("pokedraft:panel", JSON.stringify(value));
      sessionStorage.setItem("pd-test-panel-set", "1");
    }
  }, panel);
}

async function noHorizontalOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test("with the setting on, offered players and the legend show ratings and the page never scrolls sideways at 320, 360 and 390 px", async ({
  page,
}) => {
  await setPanel(page, { showChallengeRatings: true });
  await page.goto(CUP8);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("fit-269")).toHaveText("Best: FB 51 vs other FBs");
  await expect(page.getByTestId("ratings-legend")).toHaveText(
    "Ratings are 0 to 100, vs other players in the same role.",
  );
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await noHorizontalOverflow(page);
    await expect(page.getByTestId("fit-269")).toBeVisible();
  }
});

test("a placed player's pitch token shows its rating", async ({ page }) => {
  await setPanel(page, { showChallengeRatings: true });
  await page.goto(CUP8);
  await page.getByTestId("run-start").click();
  await page.getByTestId("candidate-316").click();
  await page.getByRole("button", { name: "Empty ST slot" }).click();
  await expect(page.getByTestId("slot-s9")).toContainText("5");
  await expect(page.getByTestId("slot-s9")).toContainText("Gulpin");
});

test("Position First rates the offer at the chosen slot, and a bench slot at the best role in the card layout", async ({
  page,
}) => {
  await setPanel(page, { showChallengeRatings: true });
  await page.goto(KANTO_POSITION_FIRST);
  await page.getByTestId("run-start").click();
  await page.getByRole("button", { name: "Empty SUB 1 slot" }).click();
  await expect(page.getByTestId("fit-126")).toHaveText("Best: ST 92 vs other strikers");
});

test("with the setting off the draft shows no rating and no legend, and flipping it on then off round-trips", async ({
  page,
}) => {
  await page.goto(CUP8);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("candidate-269")).toBeVisible();
  await expect(page.locator('[data-testid^="fit-"]')).toHaveCount(0);
  await expect(page.getByTestId("ratings-legend")).toHaveCount(0);

  await page.evaluate(() =>
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true })),
  );
  await page.reload();
  await expect(page.getByTestId("fit-269")).toBeVisible();

  await page.evaluate(() =>
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: false })),
  );
  await page.reload();
  await expect(page.getByTestId("candidate-269")).toBeVisible();
  await expect(page.locator('[data-testid^="fit-"]')).toHaveCount(0);
  await expect(page.getByTestId("ratings-legend")).toHaveCount(0);
});

test("the home Settings switch turns ratings on for the next challenge, and off again", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Settings and records/ }).click();
  const toggle = page.getByRole("switch", { name: /Show ratings \(challenges\)/ });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText("Challenge runs show ratings. Turn them off in Settings to play blind."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Play 8-0 Challenge" }).click();
  await page.getByTestId("run-start").click();
  await expect(page.locator('[data-testid^="fit-"]').first()).toBeVisible();
  await expect(page.getByTestId("ratings-legend")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: /Settings and records/ }).click();
  await page.getByRole("switch", { name: /Show ratings \(challenges\)/ }).click();
  await page.getByRole("link", { name: "Play 8-0 Challenge" }).click();
  await page.getByTestId("run-start").click();
  await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="fit-"]')).toHaveCount(0);
});
