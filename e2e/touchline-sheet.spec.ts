import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { box, expectPitchClear, minute, sideScroll, smallControls } from "./touchline-helpers";

// Row 3a: below 600px the touchline is a bottom sheet. Collapsed it shows the tactics, the sub
// count and any stop's button; open, the bench and energy, and the clock waits. From 600px up the
// touchline stays in the page.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/touchline-sheet";

async function toMatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "live" }),
      );
  });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("broadcast")).toBeVisible();
  await expect.poll(() => minute(page)).toBeGreaterThan(0);
}

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
] as const) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test(`collapsed the sheet shows the tactics and the sub count; open it holds the clock and confirming a sub resumes it (catches a sheet over the pitch or a clock that runs while deciding)`, async ({
      page,
    }) => {
      test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
      await toMatch(page);
      const sheet = page.getByTestId("touchline-sheet");
      const toggle = page.getByTestId("sheet-toggle");
      expect(await sheet.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
      await expect(page.getByRole("group", { name: "Tactic" }).getByRole("button")).toHaveCount(5);
      await expect(page.getByTestId("subs-count")).toHaveText("Subs 0 of 5");
      await expect(page.getByTestId("sub-confirm")).toBeHidden();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      const collapsed = await expectPitchClear(page);
      const sheetBox = await box(sheet);
      expect(sheetBox.y + sheetBox.height).toBeCloseTo(height, 0);
      expect(await smallControls(sheet)).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      console.log(
        `${width}x${height} collapsed: sheet ${Math.round(collapsed.sheet.height)} px high from y ${Math.round(collapsed.sheet.y)}, pitch bottom ${Math.round(collapsed.pitch.y + collapsed.pitch.height)}, page scrolled ${await page.evaluate(() => scrollY)} px by the Kick off tap`,
      );
      await page.screenshot({ path: `${SHOT}/${width}-collapsed.png` });

      await toggle.tap();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByTestId("sub-confirm")).toBeVisible();
      const held = await minute(page);
      await page.waitForTimeout(2_000);
      expect(await minute(page)).toBe(held);
      await expect(page.getByTestId("play-toggle")).toHaveText("Pause");

      const open = await expectPitchClear(page);
      expect(open.sheet.height).toBeLessThanOrEqual(height * 0.55 + 1);
      expect(await smallControls(sheet)).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      console.log(
        `${width}x${height} open: sheet ${Math.round(open.sheet.height)} px high from y ${Math.round(open.sheet.y)}, pitch ${Math.round(open.pitch.y)} to ${Math.round(open.pitch.y + open.pitch.height)}, clock held at ${held}'`,
      );
      await page.screenshot({ path: `${SHOT}/${width}-expanded.png` });

      await page.getByTestId("sub-confirm").scrollIntoViewIfNeeded();
      await page.getByTestId("sub-confirm").tap();
      await expect(page.getByTestId("subs-count")).toHaveText("Subs 1 of 5");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect.poll(() => minute(page), { timeout: 10_000 }).toBeGreaterThan(held);
    });
  });
}

test.describe("at 390x844 with touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a player who paused stays paused after opening and closing the sheet", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await toMatch(page);
    await page.getByTestId("play-toggle").tap();
    await expect(page.getByTestId("play-toggle")).toHaveText("Resume");
    const paused = await minute(page);
    await page.getByTestId("sheet-toggle").tap();
    await page.getByTestId("sheet-toggle").tap();
    await expect(page.getByTestId("sheet-toggle")).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(2_000);
    expect(await minute(page)).toBe(paused);
    await expect(page.getByTestId("play-toggle")).toHaveText("Resume");
  });

  test("turning the phone to landscape with the sheet open lets the clock run again (catches a hold nothing on screen can release)", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await toMatch(page);
    await page.getByTestId("sheet-toggle").tap();
    await expect(page.getByTestId("sheet-toggle")).toHaveAttribute("aria-expanded", "true");
    const held = await minute(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByTestId("sheet-toggle")).toBeHidden();
    await expect(page.getByTestId("sheet-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => minute(page), { timeout: 10_000 }).toBeGreaterThan(held);
  });

  test("at half time the collapsed sheet carries the stop's button above the touchline, with the pitch clear", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    test.setTimeout(180_000);
    await toMatch(page);
    await page.getByTestId("speed-toggle").tap();
    const halftime = page.getByTestId("stop-halftime");
    const injury = page.getByTestId("stop-injury");
    for (let i = 0; i < 12 && !(await halftime.isVisible()); i++) {
      await expect(halftime.or(injury)).toBeVisible({ timeout: 40_000 });
      if (await injury.isVisible()) await page.getByTestId("injury-confirm").tap();
    }
    const sheet = page.getByTestId("touchline-sheet");
    await expect(sheet.getByTestId("stop-go")).toBeVisible();
    await expect(page.getByTestId("sheet-toggle")).toHaveAttribute("aria-expanded", "false");
    await expectPitchClear(page);
    expect(await smallControls(sheet)).toEqual([]);
    await page.screenshot({ path: `${SHOT}/390-halftime-stop.png` });
    await sheet.getByTestId("stop-go").tap();
    await expect(halftime).toHaveCount(0);
    await expect.poll(() => minute(page), { timeout: 10_000 }).toBeGreaterThan(45);
  });
});

test("from 600px up the touchline stays in the page with no sheet toggle, at 1280px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  await page.setViewportSize({ width: 1280, height: 900 });
  await toMatch(page);
  await page.getByTestId("play-toggle").click();
  const sheet = page.getByTestId("touchline-sheet");
  expect(await sheet.evaluate((el) => getComputedStyle(el).display)).toBe("contents");
  await expect(page.getByTestId("sheet-toggle")).toBeHidden();
  await expect(page.getByTestId("sub-confirm")).toBeVisible();
  const touchline = await box(page.getByTestId("touchline"));
  const pitch = await box(page.getByTestId("broadcast"));
  console.log(
    `1280 touchline ${touchline.x},${touchline.y} ${touchline.width}x${touchline.height}; pitch ${pitch.x},${pitch.y} ${pitch.width}x${pitch.height}`,
  );
  await page.screenshot({ path: `${SHOT}/1280-desktop.png`, fullPage: true });
});

// Builder seed "shootout-1" (e2e/shootout-suspense.spec.ts): the final goes to 12 kicks, and the
// user scores the first.
const SHOOTOUT =
  "pd6.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwic2hvb3RvdXQtMSIsW1sibCIsOSwiczAiXSxbImwiLDU5LCJzMSJdLFsibCIsMTQ5LCJzMiJdLFsibCIsMTMwLCJzMyJdLFsibCIsMywiczQiXSxbImwiLDgwLCJzNSJdLFsibCIsNiwiczYiXSxbImwiLDU1LCJzNyJdLFsibCIsMjYsInM4Il0sWyJsIiw4NSwiczkiXSxbImwiLDEzNSwiczEwIl0sWyJsIiwyNSwiYjAiXSxbImwiLDk0LCJiMSJdLFsibCIsNjUsImIyIl0sWyJsIiw2OCwiYjMiXSxbImwiLDE0MywiYjQiXV1d";
const KICK_MS = 1_200;

test.describe("shootout pause at 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("pausing at kick progress 0.4 holds the kick in flight, and resuming plays it on from there (catches the 2e carryover)", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    test.setTimeout(180_000);
    await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
    await page.goto(`/r/${SHOOTOUT}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
    await page.getByTestId("match-F").getByTestId("watch-live").tap();
    const replay = page.getByTestId("match-replay");
    await expect(replay.getByTestId("broadcast")).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
    const player = replay.getByTestId("match-player");
    for (let i = 0; i < 200 && Number(await player.getAttribute("data-minute")) < 116; i++) {
      await page.clock.runFor(1_000);
    }
    for (let i = 0; i < 400 && (await player.getAttribute("data-stage")) !== "pens"; i++) {
      await page.clock.runFor(16);
    }
    await expect(player).toHaveAttribute("data-stage", "pens");
    const taker = replay.locator('[data-testid="broadcast"] [data-side="user"][data-hot="true"]');
    const pens = replay.getByTestId("matchday-pens");

    await page.clock.runFor(KICK_MS * 0.4);
    await expect(taker).toHaveAttribute("data-pose", "cast");
    await replay.getByTestId("play-toggle").tap();
    await expect(replay.getByTestId("play-toggle")).toHaveText("Resume");
    await page.clock.runFor(3_000);
    await expect(taker).toHaveAttribute("data-pose", "cast");
    await expect(replay.getByTestId("pitch-trails")).toHaveAttribute("data-kind", "shot");
    await expect(pens).toHaveCount(0);
    await page.screenshot({ path: `${SHOT}/390-pens-paused-mid-kick.png` });

    await replay.getByTestId("play-toggle").tap();
    await page.clock.runFor(KICK_MS * 0.1);
    await expect(pens).toHaveCount(0);
    await expect(taker).toHaveAttribute("data-pose", "cast");
    await page.clock.runFor(KICK_MS * 0.2);
    await expect(pens).toHaveText("Pens 1-0");
  });
});
