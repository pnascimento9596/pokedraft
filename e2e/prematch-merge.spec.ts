import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

// Row 3f: the starting tactic is picked on the pre-match card and Kick off goes straight into
// running play, with no stop at 0'.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/prematch-merge";

async function toPreMatch(page: Page, managerMode: boolean): Promise<void> {
  await page.addInitScript(
    (value) => {
      if (localStorage.getItem("pokedraft:panel") === null)
        localStorage.setItem("pokedraft:panel", JSON.stringify(value));
    },
    { managerMode, matchView: "live" },
  );
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("prematch")).toBeVisible();
}

async function sideScroll(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function minute(page: Page): Promise<number> {
  return Number(await page.getByTestId("match-player").getAttribute("data-minute"));
}

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
] as const) {
  test(`picks Attack on the pre-match card and kicks off into running play, at ${width}px (catches a 0' stop or pills under 44px)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await page.setViewportSize({ width, height });
    await toPreMatch(page, true);

    const pills = page.getByRole("group", { name: "Starting tactic" });
    await expect(pills.getByRole("button")).toHaveCount(5);
    await expect(page.getByTestId("tactic-balanced")).toHaveAttribute("aria-pressed", "true");
    const sizes: string[] = [];
    for (const pill of await pills.getByRole("button").all()) {
      const box = (await pill.boundingBox())!;
      sizes.push(`${Math.round(box.width)}x${Math.round(box.height)}`);
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    console.log(`pill sizes at ${width}px: ${sizes.join(", ")}`);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await expect(page.getByTestId("prematch-go")).toHaveText("Kick off");

    await page.getByTestId("tactic-attack").click();
    await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("tactic-balanced")).toHaveAttribute("aria-pressed", "false");
    await pills.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-prematch-attack.png` });

    await page.getByTestId("prematch-go").click();
    await expect(page.getByTestId("broadcast")).toBeVisible();
    await expect.poll(() => minute(page)).toBeGreaterThan(0);
    await expect(page.locator('[data-testid^="stop-"]')).toHaveCount(0);
    await expect(page.getByTestId("play-toggle")).toHaveText("Pause");
    await expect(page.getByTestId("touchline").getByTestId("tactic-attack")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("takeover")).toBeVisible();
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await page.getByTestId("play-toggle").click();
    await page.getByTestId("matchday-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-kicked-off.png` });
  });
}

test("keeping Balanced kicks off with the assistant still on, at 390px (catches a Balanced kickoff that records a decision)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, true);
  await page.getByTestId("tactic-attack").click();
  await page.getByTestId("tactic-balanced").click();
  await page.getByTestId("prematch-go").click();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
  await expect(page.locator('[data-testid^="stop-"]')).toHaveCount(0);
  await expect(page.getByTestId("touchline")).toBeVisible();
  await expect(page.getByTestId("takeover")).toHaveCount(0);
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("fulltime")).toBeVisible();
  await expect(page.getByTestId("ticker")).not.toContainText("Kick off: you play");
});

test("with manager mode off the pre-match card has no pills and Kick off runs the clock, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, false);
  await expect(page.getByRole("group", { name: "Starting tactic" })).toHaveCount(0);
  await expect(page.locator('[data-testid^="tactic-"]')).toHaveCount(0);
  await expect(page.getByTestId("prematch-go")).toHaveText("Kick off");
  await page.screenshot({ path: `${SHOT}/390-prematch-sim.png` });
  await page.getByTestId("prematch-go").click();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
  await expect(page.getByTestId("touchline")).toHaveCount(0);
});
