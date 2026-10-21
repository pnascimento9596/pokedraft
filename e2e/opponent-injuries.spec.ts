import { expect, test, type Locator, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

// The seed is drafted the way draftSixteen drafts it. Match 0 against Hau'oli City has Tinkatink
// (957, slot 4) injured at 25' and replaced by Tinkatuff (958), Magnemite (81) rested at 60' and
// Shieldon (410) at 75', and no injury on the user's side.

const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-opp-11";
const SHOT = "docs/reports/engine7-opponent-injuries";
const FRAME = 16;

const INJURY = "25' Tinkatink is injured. Tinkatuff comes on.";
const ROTATE_60 = "60' Hau'oli City rotate: Magnemite rested.";
const ROTATE_75 = "75' Hau'oli City rotate: Shieldon rested.";

async function toPreMatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: false, matchView: "live" }),
      );
  });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("prematch")).toBeVisible();
}

const minuteOf = async (player: Locator) => Number(await player.getAttribute("data-minute"));

/** Steps the paused clock a frame at a time until the ticker shows `line`. */
async function toLine(page: Page, player: Locator, ticker: Locator, line: string, at: number) {
  for (let i = 0; i < 400 && (await minuteOf(player)) < at - 1; i++) {
    await page.clock.runFor(1_000);
  }
  for (let i = 0; i < 4_000 && !(await ticker.textContent())?.includes(line); i++) {
    await page.clock.runFor(FRAME);
  }
  await expect(ticker.locator("li", { hasText: line })).toHaveCount(1);
}

async function sideScroll(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** The line's inline-start border, and the opponent colour it should carry. */
async function border(line: Locator) {
  return line.evaluate((li) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--bc-opp)";
    li.appendChild(probe);
    const opp = getComputedStyle(probe).color;
    probe.remove();
    const css = getComputedStyle(li);
    const box = li.getBoundingClientRect();
    return {
      width: css.borderInlineStartWidth,
      color: css.borderInlineStartColor,
      opp,
      left: Math.round(box.left),
      right: Math.round(box.right),
    };
  });
}

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
  [308, 568],
] as const) {
  test(`Tinkatink goes down at 25' and both rotations show in Hau'oli City's colour, at ${width}px (catches the opponent's injury drawn on the user's side)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    test.setTimeout(240_000);
    await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
    await page.setViewportSize({ width, height });
    await toPreMatch(page);
    await page.getByTestId("prematch-go").click();
    const player = page.getByTestId("match-player");
    await expect(player).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-20T12:30:00Z"));
    const ticker = page.getByTestId("ticker");
    const pitch = page.getByTestId("broadcast");

    await toLine(page, player, ticker, INJURY, 25);
    const down = pitch.locator('[data-side="opp"][data-slot="4"]');
    await expect(down).toHaveAttribute("data-pose", "down");
    await expect(down.locator("img")).toHaveAttribute("src", /\/0957\.\w+$/);
    await expect(pitch.locator('[data-side="user"][data-pose="down"]')).toHaveCount(0);
    const injury = ticker.locator('li[data-side="opp"][data-kind="injury"]');
    await expect(injury).toHaveText(INJURY);
    const injuryBorder = await border(injury);
    console.log(`injury line at ${width}px: ${JSON.stringify(injuryBorder)}`);
    expect(injuryBorder.width).toBe("3px");
    expect(injuryBorder.color).toBe(injuryBorder.opp);
    expect(injuryBorder.left).toBeGreaterThanOrEqual(0);
    expect(injuryBorder.right).toBeLessThanOrEqual(width);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    if (width !== 308) {
      await pitch.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/${width}-tinkatink-down.png` });
      await ticker.screenshot({ path: `${SHOT}/${width}-injury-line.png` });
    }

    await toLine(page, player, ticker, ROTATE_60, 60);
    await toLine(page, player, ticker, ROTATE_75, 75);
    const rotations = ticker.locator('li[data-side="opp"][data-kind="rotate"]');
    await expect(rotations).toHaveText([ROTATE_75, ROTATE_60]);
    const rotateBorder = await border(rotations.first());
    console.log(`rotate line at ${width}px: ${JSON.stringify(rotateBorder)}`);
    expect(rotateBorder.width).toBe("3px");
    expect(rotateBorder.color).toBe(rotateBorder.opp);
    expect(rotateBorder.right).toBeLessThanOrEqual(width);
    // The reserve's own sub line is folded into the injury line.
    await expect(ticker.locator('li[data-side="opp"][data-kind="sub"]')).toHaveCount(0);
    await expect(ticker.locator("li", { hasText: "Tinkatuff" })).toHaveCount(1);
    expect(await sideScroll(page)).toBeLessThanOrEqual(0);
    if (width !== 308) await ticker.screenshot({ path: `${SHOT}/${width}-rotation-lines.png` });
  });
}
