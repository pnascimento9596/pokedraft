import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";

// Row 6-0: the Wave 5 carryovers a player can see. The coach chips at 320 px, the exhibition empty
// state's Builder link and the empty current-engine board.

test.use({ reducedMotion: "reduce" });

const PROOF = "docs/reports/wave5-carryovers";

const ROW = {
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  createdAt: "2026-10-09T12:00:00.000Z",
  engineVersion: "pokedraft-engine-6",
  seed: "daily-2026-10-09",
  rank: 1,
  nickname: "Brock",
  token: "pd6.e2e-brock",
  teamScore: 790,
  wins: 6,
  draws: 1,
  losses: 1,
  coached: false,
  formation: "3-5-2",
};

async function setWidth(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
}

// The widest right edge of anything inside `selector`, and the page's scroll width.
async function rightEdge(page: Page, selector: string) {
  return page.evaluate((sel) => {
    let right = 0;
    for (const root of document.querySelectorAll(sel)) {
      for (const el of [root, ...root.querySelectorAll("*")]) {
        right = Math.max(right, el.getBoundingClientRect().right);
      }
    }
    return { right, scroll: document.documentElement.scrollWidth };
  }, selector);
}

// The gap on each side between a chip's text and the inside of its border.
async function chipGaps(page: Page) {
  return page.getByTestId("coach-filter").evaluate((group) =>
    [...group.querySelectorAll("button")].map((chip) => {
      const range = document.createRange();
      range.selectNodeContents(chip);
      const text = range.getBoundingClientRect();
      const box = chip.getBoundingClientRect();
      const css = getComputedStyle(chip);
      const gaps = [
        text.left - box.left - parseFloat(css.borderLeftWidth),
        box.right - parseFloat(css.borderRightWidth) - text.right,
        text.top - box.top - parseFloat(css.borderTopWidth),
        box.bottom - parseFloat(css.borderBottomWidth) - text.bottom,
      ];
      const round = (n: number) => Math.round(n * 10) / 10;
      return {
        label: chip.textContent,
        min: round(Math.min(...gaps)),
        sides: round(Math.min(gaps[0]!, gaps[1]!)),
      };
    }),
  );
}

test("each coach chip's label keeps 4 px inside its border at 390, 360, 320 and 308 (catches Uncoached touching its border)", async ({
  page,
}) => {
  await page.route("**/api/leaderboard?**", (route) =>
    route.fulfill({
      json: {
        mode: "cup8",
        scope: "daily",
        date: "2026-10-09",
        coach: new URL(route.request().url()).searchParams.get("coach") ?? "all",
        engine: "all",
        entries: [ROW],
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
  await expect(page.getByTestId("board-row")).toHaveCount(1);
  for (const [width, height] of [
    [390, 844],
    [360, 780],
    [320, 640],
    [308, 640],
  ] as const) {
    await setWidth(page, width, height);
    const gaps = await chipGaps(page);
    const edge = await rightEdge(page, "main");
    console.log(`${width}px chip gaps ${JSON.stringify(gaps)}, right edge ${edge.right}`);
    expect(gaps.map((g) => g.label)).toEqual(["All", "Uncoached", "Coached"]);
    for (const gap of gaps) expect(gap.min, gap.label ?? "").toBeGreaterThanOrEqual(4);
    expect(edge.scroll).toBeLessThanOrEqual(width);
    if (width !== 308) {
      await page.getByTestId("coach-filter").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${PROOF}/coach-chips-${width}.png` });
    }
  }
});

test("Open the Builder on the empty exhibition goes to the builder section (catches a link to the top of the home page)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/exhibition?away=${GOLDEN_CUP8_V3}`);
  await expect(page.getByTestId("exhibition-empty")).toBeVisible();
  await page.getByRole("link", { name: "Open the Builder" }).click();
  await expect(page).toHaveURL(/\/#builder$/);
  const builder = page.getByRole("region", { name: "Pitch builder" });
  await expect(builder).toHaveAttribute("id", "builder");
  await expect
    .poll(() => builder.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBeLessThan(120);
  const at = await page.evaluate(() => ({
    scrollY,
    top: document.getElementById("builder")?.getBoundingClientRect().top,
  }));
  console.log(`builder after the link: ${JSON.stringify(at)}`);
  expect(at.scrollY).toBeGreaterThan(0);
  await page.screenshot({ path: `${PROOF}/open-the-builder-390.png` });
});

test("an empty current-engine board with older runs says why and switches to All engines in one tap, at 390, 360, 320 and 308 (catches No entries yet on the board after an engine change)", async ({
  page,
}) => {
  const seen: string[] = [];
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    seen.push(url.search);
    const engine = url.searchParams.get("engine") ?? "current";
    return route.fulfill({
      json: {
        mode: "cup8",
        scope: "all",
        date: null,
        coach: "all",
        engine,
        seed: null,
        entries:
          engine === "all"
            ? [{ ...ROW, dailyDate: null, engineVersion: "pokedraft-engine-3" }]
            : [],
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/leaderboard?mode=cup8&scope=all");
  const empty = page.getByTestId("board-empty-engine");
  await expect(empty).toContainText("No runs on this engine yet.");
  await expect(page.getByTestId("board-empty")).toHaveCount(0);
  for (const [width, height] of [
    [390, 844],
    [360, 780],
    [320, 640],
    [308, 640],
  ] as const) {
    await setWidth(page, width, height);
    const edge = await rightEdge(page, '[data-testid="board-empty-engine"]');
    console.log(`${width}px empty engine board right edge ${edge.right}, scroll ${edge.scroll}`);
    expect(edge.scroll).toBeLessThanOrEqual(width);
    expect(edge.right).toBeLessThanOrEqual(width === 308 ? 308 : width - 12);
    if (width !== 308) {
      await empty.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${PROOF}/empty-engine-board-${width}.png` });
    }
  }
  await setWidth(page, 390, 844);
  await page.getByRole("button", { name: "Show all engines" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=all&engine=all$/);
  await expect(page.getByTestId("board-row")).toHaveCount(1);
  await expect(page.getByTestId("engine-row-label")).toHaveText(["Engine v3"]);
  await expect(page.getByTestId("engine-filter-all")).toHaveAttribute("aria-pressed", "true");
  expect(seen).toEqual([
    "?mode=cup8&scope=all",
    "?mode=cup8&scope=all&engine=all",
    "?mode=cup8&scope=all&engine=all",
  ]);
});
