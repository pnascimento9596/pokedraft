import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";
import { EXHIBITION_ROUTE as PIN } from "./pins";

test.use({ reducedMotion: "reduce" });

const PROOF = "docs/reports/exhibition-route";

// The golden engine-3 cup8 run: seed golden-cup8, 4-2-3-1, 3-0-2.
const GOLDEN_SQUAD = [
  849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
];

// A Builder friendly of Pokedex 1 to 16 (newest) and the golden run, as History saves them.
const HISTORY = [
  {
    token: PIN.friendly,
    squadSpeciesIds: Array.from({ length: 16 }, (_, index) => index + 1),
    bucket: "builder",
    friendly: true,
    formation: "4-3-3",
    score: 640,
    wins: 4,
    draws: 1,
    losses: 3,
    finish: "QF",
    flawless: false,
    at: "2026-10-19T12:00:00.000Z",
  },
  {
    token: GOLDEN_CUP8_V3,
    squadSpeciesIds: GOLDEN_SQUAD,
    bucket: "cup8:classic3",
    friendly: false,
    formation: "4-2-3-1",
    score: 700,
    wins: 3,
    draws: 0,
    losses: 2,
    finish: "R16",
    flawless: false,
    at: "2026-10-17T12:00:00.000Z",
  },
];

const WIDE = "W".repeat(20);

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function setWidth(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
}

// The widest right edge of anything inside `selector`, and the page's own scroll width.
async function rightEdge(page: Page, selector: string) {
  return page.evaluate((sel) => {
    let right = 0;
    for (const root of document.querySelectorAll(sel)) {
      right = Math.max(right, root.getBoundingClientRect().right);
      for (const el of root.querySelectorAll("*")) {
        right = Math.max(right, el.getBoundingClientRect().right);
      }
    }
    return { right, scroll: document.documentElement.scrollWidth };
  }, selector);
}

// Hosted CI fonts run a few px wider than macOS, so each width keeps 12 px of headroom and the
// same content must still fit 12 px narrower.
async function fitsWithHeadroom(page: Page, selector: string, label: string) {
  for (const width of [320, 308]) {
    await setWidth(page, width, 568);
    const edge = await rightEdge(page, selector);
    console.log(
      `${label} at ${width}px: right edge ${edge.right.toFixed(1)}, scroll ${edge.scroll}`,
    );
    expect(edge.scroll).toBeLessThanOrEqual(width);
    expect(edge.right).toBeLessThanOrEqual(308);
  }
}

// Manager mode is off by default, so Skip to full time ends the match at once.
async function playToFullTime(page: Page, kickOff = true) {
  if (kickOff) await page.getByTestId("exhibition-kickoff").click();
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("exhibition-fulltime")).toBeVisible();
}

async function seedHistory(page: Page) {
  await page.addInitScript((runs) => {
    if (sessionStorage.getItem("seeded") !== null) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
  }, HISTORY);
}

for (const [width, height] of [
  [390, 844],
  [360, 800],
  [320, 568],
] as const) {
  test(`a history row opens an exhibition against its squad and plays it, at ${width}px`, async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.setViewportSize({ width, height });
    await seedHistory(page);
    await page.goto("/history");
    const link = page.getByRole("link", { name: /^Exhibition vs this squad: .*, 3-0-2$/ });
    await expect(link).toHaveText("Exhibition vs this squad");
    await expect(link).toHaveAttribute("href", `/exhibition?away=${GOLDEN_CUP8_V3}`);
    await link.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${PROOF}/history-row-${width}.png` });
    const history = await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"));

    await link.click();
    await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}`);
    const main = page.getByRole("main");
    const picker = main.getByRole("combobox", { name: "Your squad" });
    await expect(picker).toHaveValue(PIN.friendly);
    await expect(picker.locator("option")).toHaveText([/, 4-3-3, 4-1-3$/, /, 4-2-3-1, 3-0-2$/]);
    await expect(main.getByTestId("exhibition-mirror")).toHaveCount(0);
    await playToFullTime(page);
    await expect(main.getByTestId("exhibition-score")).toHaveText(PIN.friendlyVsGolden);
    await expect(main.getByTestId("matchday-scoreboard")).toContainText("Their squad");
    const fulltime = main.getByTestId("exhibition-fulltime");
    await expect(fulltime).toContainText(/Your squad wins|Their squad wins|Honours even/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await fulltime.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${PROOF}/exhibition-${width}.png` });

    await picker.selectOption(GOLDEN_CUP8_V3);
    await expect(page).toHaveURL(`/exhibition?home=${GOLDEN_CUP8_V3}&away=${GOLDEN_CUP8_V3}`);
    await expect(main.getByTestId("exhibition-mirror")).toHaveText("Same squad on both sides");
    await playToFullTime(page);
    await expect(main.getByTestId("exhibition-score")).toHaveText(PIN.goldenMirror);

    expect(await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"))).toBe(history);
    expect(errors).toEqual([]);
  });
}

test("the exhibition page in both themes at 390, 360 and 320, with 12 px of headroom", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await seedHistory(page);
  await page.goto(`/exhibition?away=${GOLDEN_CUP8_V3}&name=${WIDE}&legs=2`);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(`Your squad vs ${WIDE}'s squad`);
  await playToFullTime(page);
  await main.getByRole("button", { name: "Play leg 2" }).click();
  await playToFullTime(page, false);
  await expect(main.getByTestId("exhibition-aggregate")).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of [
      [390, 844],
      [360, 800],
      [320, 568],
    ] as const) {
      await setWidth(page, width, height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await page.screenshot({ path: `${PROOF}/route-${width}-${theme}.png` });
    }
  }
  await fitsWithHeadroom(page, "main > *", "exhibition page, widest name, two legs");
  expect(errors).toEqual([]);
});

test("history and board row actions keep 12 px of headroom at 320 and fit at 308", async ({
  page,
}) => {
  await seedHistory(page);
  await page.goto("/history");
  await expect(page.getByRole("link", { name: /^Exhibition vs this squad/ })).toHaveCount(2);
  await fitsWithHeadroom(page, '[data-testid="history-list"]', "history rows");

  await page.route("**/api/leaderboard?**", (route) =>
    route.fulfill({
      json: {
        mode: "cup8",
        scope: "all",
        date: null,
        coach: "all",
        engine: "current",
        entries: [
          {
            rank: 1,
            nickname: WIDE,
            mode: "cup8",
            variant: "classic3.squadFirst.g123456789",
            dailyDate: "2026-10-09",
            token: GOLDEN_CUP8_V3,
            teamScore: 812,
            wins: 7,
            draws: 1,
            losses: 0,
            createdAt: "2026-10-09T12:00:00.000Z",
            coached: true,
            engineVersion: "pokedraft-engine-3",
            seed: "golden-cup8",
            formation: "4-2-3-1",
            squadSpeciesIds: GOLDEN_SQUAD,
          },
        ],
      },
    }),
  );
  await page.addInitScript((nick) => {
    localStorage.setItem("pokedraft:nickname", JSON.stringify(nick));
  }, WIDE);
  await page.goto("/leaderboard?mode=cup8&scope=all");
  const row = page.getByTestId("board-row");
  const link = row.getByRole("link", { name: `Exhibition vs this squad: ${WIDE}, 7-1-0` });
  await expect(link).toHaveAttribute("href", `/exhibition?away=${GOLDEN_CUP8_V3}&name=${WIDE}`);
  await fitsWithHeadroom(page, '[data-testid="board"]', "board row, widest own coached row");
  await setWidth(page, 320, 568);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${PROOF}/board-row-320.png` });
  await link.click();
  await expect(page).toHaveURL(`/exhibition?away=${GOLDEN_CUP8_V3}&name=${WIDE}`);
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(
    `Your squad vs ${WIDE}'s squad`,
  );
});
