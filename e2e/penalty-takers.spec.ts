import { expect, test, type Page } from "@playwright/test";
import { draftSixteen, skipManaged } from "./helpers";

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/engine7-penalties";

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

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
  [308, 568],
] as const) {
  test(`shows the Set pieces row on the pre-match card and the touchline, at ${width}px (catches selects under 44px or off screen)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await page.setViewportSize({ width, height });
    await toPreMatch(page, true);

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

test("nominating a penalty taker on the pre-match card records the choice and that player takes the match penalty (catches a nomination dropped before playMatch)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, true);
  await page.getByLabel("Penalties").selectOption("1");
  await expect(page.getByLabel("Penalties")).toHaveValue("1");
  await page.getByTestId("prematch-go").click();
  await skipManaged(page);
  await expect(page.getByTestId("fulltime")).toBeVisible();
  await expect(page.getByTestId("ticker")).toContainText(
    "72' Goal for Your XI! Oricorio from the spot",
  );
});

test("sim mode shows no Set pieces row, at 390px", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await toPreMatch(page, false);
  await expect(page.getByTestId("set-pieces")).toHaveCount(0);
});
