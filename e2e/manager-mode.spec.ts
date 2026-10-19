import { expect, test, type Page } from "@playwright/test";
import { draftSixteen, skipManaged } from "./helpers";
import { SHARE_LINK } from "./pins";

// Manager mode and the Live match broadcast. The settings are seeded before the app loads, the
// way a player who switched them on at home arrives at the challenge.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";

async function seedPanel(page: Page, panel: Record<string, unknown>): Promise<void> {
  await page.addInitScript((value) => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem("pokedraft:panel", JSON.stringify(value));
  }, panel);
}

async function toMatchday(page: Page): Promise<void> {
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("matchday")).toBeVisible();
  await expect(page.getByTestId("prematch")).toBeVisible();
}

/** Answers injury stops with the assistant's pick until the wanted stop shows. */
async function untilStop(page: Page, kind: "halftime" | "extraTime"): Promise<void> {
  const wanted = page.getByTestId(`stop-${kind}`);
  const injury = page.getByTestId("stop-injury");
  for (let i = 0; i < 12; i++) {
    await expect(wanted.or(injury)).toBeVisible({ timeout: 40_000 });
    if (await wanted.isVisible()) return;
    await page.getByTestId("injury-confirm").click();
  }
  throw new Error(`no ${kind} stop`);
}

/** Skips each remaining match to full time and moves on, until the results page shows. */
async function finishCup(page: Page): Promise<void> {
  for (let i = 0; i < 9; i++) {
    if (await page.getByTestId("results-record").isVisible()) return;
    const pre = page.getByTestId("prematch-go");
    if (await pre.isVisible()) await pre.click();
    await skipManaged(page);
    await page.getByTestId("fulltime-next").click();
    await expect(page.getByTestId("prematch").or(page.getByTestId("results-record"))).toBeVisible();
  }
  await expect(page.getByTestId("results-record")).toBeVisible();
}

test.describe("manager mode", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"], reducedMotion: "reduce" });

  test("coaches a match with a tactic change and a substitution, and the share link replays the coached run", async ({
    page,
  }) => {
    await seedPanel(page, { managerMode: true, matchView: "quick" });
    await toMatchday(page);

    // The starting tactic is picked on the pre-match card; Kick off goes straight to running play.
    await page.getByTestId("tactic-attack").click();
    await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("prematch-go").click();
    await expect(page.getByTestId("broadcast")).toBeVisible();
    await expect(page.getByTestId("soccer-ball-svg")).toBeVisible();
    await expect(page.locator('[data-testid^="stop-"]')).toHaveCount(0);
    await expect
      .poll(async () => Number(await page.getByTestId("match-player").getAttribute("data-minute")))
      .toBeGreaterThan(0);
    await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("match-hud")).toContainText("Attack");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("takeover")).toHaveText(
      "You have the touchline. Your assistant stops making changes this match.",
    );
    // Manager mode plays live; 2x keeps the wait for half time near 13 s.
    await page.getByTestId("speed-toggle").click();

    // Half time: one substitution from the bench.
    await untilStop(page, "halftime");
    await expect(page.getByTestId("touchline-minute")).toHaveText("45'");
    const before = await page.getByTestId("subs-count").textContent();
    const used = Number(/Subs (\d) of 5/.exec(before ?? "")?.[1]);
    // On a phone the bench and energy rows are in the touchline sheet.
    const sheet = page.getByTestId("sheet-toggle");
    if (await sheet.isVisible()) await sheet.click();
    await page.getByTestId("energy-slot-4").click();
    await expect(page.getByTestId("energy-slot-4")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("sub-confirm").click();
    await expect(page.getByTestId("subs-count")).toHaveText(`Subs ${used + 1} of 5`);
    await page.getByTestId("stop-go").click();

    await skipManaged(page);
    await expect(page.getByTestId("fulltime")).toBeVisible();
    await expect(page.getByTestId("ticker")).toContainText("Kick off: you play Attack");
    await expect(page.getByTestId("ticker")).toContainText("(tactical, your call)");
    await page.getByTestId("fulltime-next").click();

    await finishCup(page);
    await expect(page.getByTestId("coached-pill")).toHaveText("Coached");
    const record = await page.getByTestId("results-record").textContent();
    const score = await page.getByTestId("results-score").textContent();

    await page.getByRole("button", { name: "Share", exact: true }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(SHARE_LINK);
    await page.goto(link);
    await expect(page.getByTestId("results-record")).toHaveText(record!);
    await expect(page.getByTestId("results-score")).toHaveText(score!);
    await expect(page.getByTestId("coached-pill")).toHaveText("Coached");
    await page.getByTestId("match-G1").getByTestId("match-incidents").locator("summary").click();
    // The shared link is a friend's view of the run, so it names the side "this squad".
    await expect(page.getByTestId("match-G1").getByTestId("match-incidents")).toContainText(
      "Kick off: this squad plays Attack",
    );
  });

  test("a reload during the matchday comes back at the same match with the decisions kept", async ({
    page,
  }) => {
    await seedPanel(page, { managerMode: true, matchView: "quick" });
    await toMatchday(page);
    await page.getByTestId("tactic-attack").click();
    await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("prematch-go").click();
    await skipManaged(page);
    await page.getByTestId("fulltime-next").click();
    await expect(page.getByTestId("matchday")).toHaveAttribute("data-match", "1");
    const title = await page.getByTestId("matchday-title").textContent();

    await page.reload();
    await expect(page.getByTestId("matchday")).toHaveAttribute("data-match", "1");
    await expect(page.getByTestId("matchday-title")).toHaveText(title!);
    await expect(page.getByTestId("prematch")).toBeVisible();

    await finishCup(page);
    await expect(page.getByTestId("coached-pill")).toHaveText("Coached");
    await page.getByTestId("match-G1").getByTestId("match-incidents").locator("summary").click();
    await expect(page.getByTestId("match-G1").getByTestId("match-incidents")).toContainText(
      "Kick off: you play Attack",
    );
  });

  test("a start screen follows manager mode and the match view changed in another tab", async ({
    page,
    context,
  }) => {
    await page.goto(PLAY);
    await expect(page.getByTestId("manager-mode")).toHaveAttribute("aria-checked", "false");
    const other = await context.newPage();
    await other.goto(PLAY);
    await other.getByTestId("manager-mode").click();
    await other.getByTestId("match-view-live").click();
    await expect(other.getByTestId("manager-mode")).toHaveAttribute("aria-checked", "true");

    await expect(page.getByTestId("manager-mode")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("match-view-live")).toHaveAttribute("aria-pressed", "true");
    await other.close();
  });

  test("with manager mode off and the quick view, See results goes straight to the results", async ({
    page,
  }) => {
    await page.goto(PLAY);
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await page.getByTestId("see-results").click();
    await expect(page.getByTestId("results-record")).toBeVisible();
    await expect(page.getByTestId("matchday")).toHaveCount(0);
    await expect(page.getByTestId("coached-pill")).toHaveCount(0);
  });
});

async function noSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const width of [1280, 360]) {
  test(`Live match plays the broadcast with a move callout at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: width === 360 ? 780 : 900 });
    await seedPanel(page, { managerMode: false, matchView: "live" });
    await toMatchday(page);
    await page.getByTestId("prematch-go").click();
    await expect(page.getByTestId("broadcast")).toHaveAttribute("data-motion", "on");
    await expect(page.getByTestId("soccer-ball-svg")).toBeVisible();
    await expect(page.getByTestId("ball-carrier")).toBeVisible();
    await page.getByTestId("speed-toggle").click();
    // Some match in the cup has a goal; play each one until a move callout shows.
    let seen = false;
    for (let m = 0; m < 8 && !seen; m++) {
      if (m > 0) await page.getByTestId("prematch-go").click();
      seen = await page
        .getByTestId("move-callout")
        .waitFor({ timeout: 30_000 })
        .then(
          () => true,
          () => false,
        );
      if (seen) {
        await expect(page.getByTestId("move-callout")).toHaveText(/ (used .+|shoots)!$/);
        await noSideScroll(page);
      }
      if (await page.getByTestId("results-record").isVisible()) break;
      await page.getByTestId("skip-ft").click();
      await page.getByTestId("fulltime-next").click();
    }
    expect(seen).toBe(true);
    for (const target of await page.locator('[data-testid="match-player"] button').all()) {
      const box = await target.boundingBox();
      if (box !== null) expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
    await noSideScroll(page);
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Live match draws a still pitch and keeps the ticker", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await seedPanel(page, { managerMode: false, matchView: "live" });
    await toMatchday(page);
    await page.getByTestId("prematch-go").click();
    await expect(page.getByTestId("broadcast")).toHaveAttribute("data-motion", "off");
    await page.getByTestId("skip-ft").click();
    await expect(page.getByTestId("ticker")).toContainText(/Full time|End of extra time/);
    await noSideScroll(page);
  });
});
