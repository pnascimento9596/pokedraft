import { expect, test } from "@playwright/test";
import { shareAndReplay } from "./helpers";

test.describe("challenge drafts", () => {
  test.use({
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });

  test("Position First 8-0 asks for a slot before it rolls, drafts 16 and replays the same record", async ({
    page,
  }) => {
    await page.goto(
      "/play?mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=open&seed=e2e-pf",
    );
    await page.getByTestId("run-start").click();
    const header = page.getByTestId("round-header");
    for (let round = 1; round <= 16; round++) {
      await expect(header).toHaveText(`Round ${round} of 16`);
      await expect(page.getByTestId("round-prompt")).toHaveText(`Pick a slot for round ${round}`);
      await expect(page.locator('[data-testid^="candidate-"]')).toHaveCount(0);
      await page.locator('[data-testid^="slot-"][data-filled="false"]').first().click();
      await expect(page.getByTestId("round-prompt")).toHaveCount(0);
      await page.locator('[data-testid^="candidate-"]').first().click();
    }
    await expect(header).toHaveText("Draft complete");
    await page.getByTestId("see-results").click();
    await shareAndReplay(page, "1-2-1");
  });

  test("8-0 rerolls share one count of 3 across type and region", async ({ page }) => {
    await page.goto("/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-rr");
    await page.getByTestId("run-start").click();
    const type = page.getByRole("button", { name: /^Reroll type / });
    const region = page.getByRole("button", { name: /^Reroll region / });
    await expect(type).toHaveAccessibleName("Reroll type 3/3, 3 left");
    await expect(region).toHaveAccessibleName("Reroll region 3/3, 3 left");
    // The rolled region and type, as the line under the round header reads them.
    const rolled = page.locator('[data-testid="round-header"] + div');
    await expect(rolled).toHaveText("JohtoFire");

    // A type reroll keeps the region and draws another type.
    await type.click();
    await expect(type).toHaveAccessibleName("Reroll type 2/3, 2 left");
    await expect(region).toHaveAccessibleName("Reroll region 2/3, 2 left");
    await expect(rolled).toHaveText("JohtoBug");

    await region.click();
    await region.click();
    await expect(type).toHaveAccessibleName("Reroll type 0/3, 0 left");
    // Spent reroll buttons stay focusable with aria-disabled, so a press keeps focus and does nothing.
    await expect(type).toHaveAttribute("aria-disabled", "true");
    await expect(region).toHaveAttribute("aria-disabled", "true");
  });

  test("151 has five rerolls and the button stops at 0", async ({ page }) => {
    await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-rr");
    await page.getByTestId("run-start").click();
    const reroll = page.getByRole("button", { name: /^Reroll / });
    for (const left of [5, 4, 3, 2, 1]) {
      await expect(reroll).toHaveAccessibleName(`Reroll ${left}/5, ${left} left`);
      await expect(reroll).not.toHaveAttribute("aria-disabled", "true");
      await reroll.click();
    }
    await expect(reroll).toHaveAccessibleName("Reroll 0/5, 0 left");
    await expect(reroll).toHaveAttribute("aria-disabled", "true");
  });
});

test("the home Start link carries the chosen order into the run", async ({ page }) => {
  await page.goto("/");
  // The settings are open on first load, so there is no toggle to press.
  await page
    .getByRole("group", { name: "Order" })
    .getByRole("button", { name: "Position First" })
    .click();
  await page.getByRole("button", { name: "Play 151 Challenge" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Yes, play" }).click();
  await expect(page).toHaveURL(/\/play\?mode=kanto151&f=4-3-3&order=positionFirst$/);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-prompt")).toHaveText("Pick a slot for round 1");
});

test.describe("builder Randomize with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Randomize runs the cascade, then shows 16 players and the Team Score", async ({ page }) => {
    await page.goto("/");
    // Record whether the pitch ever entered the animating state, however short it is.
    await page.evaluate(() => {
      const w = window as unknown as { sawCascade: boolean };
      w.sawCascade = false;
      new MutationObserver(() => {
        if (document.querySelector("[data-animating]")) w.sawCascade = true;
      }).observe(document.body, { attributes: true, subtree: true, childList: true });
    });
    await page.getByRole("button", { name: "Randomize" }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { sawCascade: boolean }).sawCascade))
      .toBe(true);
    // The cascade lasts 1120 ms (15 staggers of 60 ms plus a 220 ms flicker).
    await expect(page.locator("[data-animating]")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
    await expect(page.getByTestId("team-score")).toContainText("Team Score");
    await expect(page.getByRole("button", { name: "Randomize" })).toBeEnabled();
  });
});
