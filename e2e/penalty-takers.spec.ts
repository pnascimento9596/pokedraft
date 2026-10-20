import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { switchToV7 } from "./v7-switch";

// Row 6b3: the "Set pieces" row on the pre-match card and in the touchline's expanded view. It
// renders only when ENGINE_COEFFICIENTS.penalty.missable is true, which no shipped build has
// before the engine 7 flip. To see it, switchOn() rewrites this row's coefficients in the client
// chunks the browser downloads, to their engine 7 values (e2e/v7-switch.ts). Nothing in the app
// reads a flag, a query or storage to show the row.
//
// Tokens stay pd6 under the rewrite, and encodeToken refuses a nominated taker in a pd6 token, so
// recording a nomination here would (correctly) throw when the run is saved. These tests therefore
// pick a taker to show the select works, then go back to Auto before kicking off. Recording is
// covered by the unit tests; engine 7 flips missable and the token version together.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/engine7-penalties";
const LIVE = "penalty:{missable:!1,awardShare:0},takers:{freeKickWeight:1}";
const V7 = "penalty:{missable:!0,awardShare:.077},takers:{freeKickWeight:1.5}";

/** Rewrites the live set-piece coefficients to engine 7's; returns how many it rewrote. */
function switchOn(page: Page): Promise<() => number> {
  return switchToV7(page, [[LIVE, V7]]);
}

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

/** Both selects are at least 44 px tall and sit inside the viewport; returns their sizes. */
async function checkSelects(page: Page, scope: string, width: number): Promise<string> {
  const sizes: string[] = [];
  for (const set of ["penalty", "freeKick"]) {
    const box = (await page.locator(`${scope} [data-testid="taker-${set}"]`).boundingBox())!;
    sizes.push(
      `${set} ${Math.round(box.width)}x${Math.round(box.height)} at x ${Math.round(box.x)}`,
    );
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  return sizes.join(", ");
}

test("engine 6 shows no Set pieces row on the pre-match card or the touchline, at 390px (catches the control shipping before the flip)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, true);
  await expect(page.getByRole("group", { name: "Starting tactic" })).toBeVisible();
  await expect(page.getByTestId("set-pieces")).toHaveCount(0);
  await page.getByTestId("prematch-go").click();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
  await page.getByTestId("sheet-toggle").click();
  await expect(page.getByTestId("touchline")).toHaveAttribute("data-expanded", "true");
  await expect(page.getByTestId("set-pieces")).toHaveCount(0);
});

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
  [308, 568],
] as const) {
  test(`with engine 7's set-piece rule, shows the Set pieces row on the pre-match card and the touchline, at ${width}px (catches selects under 44px or off screen)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    const rewritten = await switchOn(page);
    await page.setViewportSize({ width, height });
    await toPreMatch(page, true);
    expect(rewritten()).toBeGreaterThan(0);

    const row = page.getByRole("group", { name: "Set pieces" });
    await expect(row).toBeVisible();
    await expect(page.getByLabel("Penalties")).toHaveValue("auto");
    await expect(page.getByLabel("Free kicks")).toHaveValue("auto");
    await expect(page.getByLabel("Penalties").locator("option").first()).toHaveText(
      "Auto (best shooter)",
    );
    await expect(page.getByLabel("Penalties").locator("option")).toHaveCount(12);
    console.log(
      `pre-match selects at ${width}px: ${await checkSelects(page, "[data-testid=prematch]", width)}`,
    );
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);

    await page.getByLabel("Penalties").selectOption({ index: 11 });
    await expect(page.getByLabel("Penalties")).not.toHaveValue("auto");
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-prematch-set-pieces.png` });
    await page.getByLabel("Penalties").selectOption("auto");

    await page.getByTestId("prematch-go").click();
    await expect.poll(() => minute(page)).toBeGreaterThan(0);
    await page.getByTestId("play-toggle").click();
    await page.getByTestId("sheet-toggle").click();
    const sheet = page.getByTestId("touchline");
    await expect(sheet).toHaveAttribute("data-expanded", "true");
    await expect(sheet.getByTestId("set-pieces")).toBeVisible();
    await expect(sheet.getByTestId("taker-penalty")).toHaveValue("auto");
    await expect(sheet.getByTestId("taker-freeKick")).toHaveValue("auto");
    console.log(
      `touchline selects at ${width}px: ${await checkSelects(page, "[data-testid=touchline]", width)}`,
    );
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    await sheet.getByTestId("set-pieces").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-touchline-set-pieces.png` });
  });
}

test("with engine 7's set-piece rule, sim mode still shows no Set pieces row, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  const rewritten = await switchOn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, false);
  expect(rewritten()).toBeGreaterThan(0);
  await expect(page.getByTestId("set-pieces")).toHaveCount(0);
});
