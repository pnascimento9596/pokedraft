import { expect, test, type Page } from "@playwright/test";
import { accessibleName, draftSixteen } from "./helpers";
import { SHARE_LINK } from "./pins";

test.use({ reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });

// The engine 3 golden cup8 run (e2e/seed-board.spec.ts): seed golden-cup8, 4-2-3-1, 3-0-2.
const GOLDEN_RUN =
  "pd3.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAiLDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwxODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsicCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXV0";

const SQUAD = [849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884];

const ROW = {
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  createdAt: "2026-10-09T12:00:00.000Z",
  engineVersion: "pokedraft-engine-6",
  seed: "daily-2026-10-09",
};

// Twenty capital Ws is the widest nickname the server accepts; as the player's own coached row it
// carries both chips, the widest a row gets.
const WIDE = "W".repeat(20);

const ROWS = [
  {
    ...ROW,
    rank: 1,
    nickname: WIDE,
    token: GOLDEN_RUN,
    teamScore: 812,
    wins: 7,
    draws: 1,
    losses: 0,
    coached: true,
    formation: "4-2-3-1",
    squadSpeciesIds: SQUAD,
  },
  {
    ...ROW,
    rank: 2,
    nickname: "Brock",
    token: "pd6.e2e-brock",
    teamScore: 790,
    wins: 6,
    draws: 1,
    losses: 1,
    coached: false,
    formation: "3-5-2",
  },
  {
    ...ROW,
    rank: 3,
    nickname: "Old run",
    token: "pd6.e2e-old",
    teamScore: 700,
    wins: 5,
    draws: 0,
    losses: 3,
    coached: false,
    formation: null,
  },
];

async function stubDaily(page: Page) {
  await page.route("**/api/leaderboard?**", (route) =>
    route.fulfill({
      json: {
        mode: "cup8",
        scope: "daily",
        date: "2026-10-09",
        coach: "all",
        engine: "all",
        entries: ROWS,
      },
    }),
  );
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// The widest right edge of anything inside `selector`, and the page's own scroll width.
async function rightEdge(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    let right = root.getBoundingClientRect().right;
    for (const el of root.querySelectorAll("*")) {
      right = Math.max(right, el.getBoundingClientRect().right);
    }
    return { right, scroll: document.documentElement.scrollWidth, inner: innerWidth };
  }, selector);
}

async function setWidth(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
}

test("the player's own Daily row is marked, named and shows the formation, at 390, 360 and 320 in both themes", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.addInitScript((nick) => {
    localStorage.setItem("pokedraft:nickname", JSON.stringify(`  ${nick} `));
  }, WIDE);
  await stubDaily(page);
  await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
  const rows = page.getByTestId("board-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute("data-me", "true");
  await expect(rows.nth(1)).not.toHaveAttribute("data-me");
  await expect(rows.nth(0).getByTestId("own-row-chip")).toHaveText("You");
  expect(await accessibleName(rows.nth(0).getByRole("link").first())).toContain(`${WIDE}, you`);
  await expect(rows.nth(0)).toContainText("4-2-3-1");
  await expect(rows.nth(1)).toContainText("3-5-2");
  await expect(rows.nth(2)).toContainText("Open, Squad First, All regions");
  await expect(
    rows.nth(0).getByRole("link", { name: `Challenge this Seed: ${WIDE}, 7-1-0`, exact: true }),
  ).toHaveText("Challenge this Seed");

  const board = page.getByRole("group", { name: "Board" });
  await expect(board.getByRole("button", { name: "Daily" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.locator('[role="tab"], [role="tablist"]').count()).toBe(0);

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of [
      [390, 844],
      [360, 800],
      [320, 568],
    ] as const) {
      await setWidth(page, width, height);
      const edge = await rightEdge(page, '[data-testid="board"]');
      expect(edge.scroll).toBeLessThanOrEqual(width);
      expect(edge.right).toBeLessThanOrEqual(width);
      await rows.nth(0).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/reports/board-ux/own-row-${width}-${theme}.png` });
    }
  }

  // Linux CI fonts run a few px wider than macOS: the board must still fit 12 px narrower.
  await setWidth(page, 308, 568);
  const tight = await rightEdge(page, '[data-testid="board"]');
  expect(tight.scroll).toBeLessThanOrEqual(308);
  expect(tight.right).toBeLessThanOrEqual(308);
  expect(errors).toEqual([]);
});

test("the Board and Mode controls are pressed buttons that move the URL", async ({ page }) => {
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        mode: url.searchParams.get("mode"),
        scope: url.searchParams.get("scope"),
        date: url.searchParams.get("date"),
        coach: "all",
        engine: url.searchParams.get("scope") === "all" ? "current" : "all",
        entries: [],
      },
    });
  });
  await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
  await page
    .getByRole("group", { name: "Board" })
    .getByRole("button", { name: "All-time" })
    .click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=all$/);
  const mode = page.getByRole("group", { name: "Mode" });
  await expect(mode.getByRole("button", { name: "8-0 Challenge" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await mode.getByRole("button", { name: "151 Challenge" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=kanto151&scope=all$/);
  await expect(mode.getByRole("button", { name: "151 Challenge" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("engine-filter-all")).toHaveAttribute("aria-pressed", "false");
  expect(await page.locator('[role="radio"], [role="radiogroup"]').count()).toBe(0);
});

test("Share my rank sits next to View leaderboard and copies the run link, at 390 and 320", async ({
  page,
}) => {
  await page.route("**/api/leaderboard", (route) =>
    route.fulfill({
      status: 201,
      json: { entry: { ...ROWS[1], rank: 4, nickname: "Misty", token: "pd6.e2e-posted" } },
    }),
  );
  await page.goto("/daily");
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("submit-nickname").fill("Misty");
  await page.getByTestId("submit-button").click();
  await expect(page.getByTestId("submit-success")).toHaveText(
    "#4Misty is on the daily board, among uncoached runs.",
  );
  const panel = page.getByTestId("submit-panel");
  await expect(panel.getByRole("link", { name: "View leaderboard" })).toBeVisible();
  const share = panel.getByRole("button", { name: "Share my rank" });
  await share.click();
  await expect(panel.getByRole("status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(SHARE_LINK);

  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ] as const) {
    await setWidth(page, width, height);
    const edge = await rightEdge(page, '[data-testid="submit-panel"]');
    expect(edge.scroll).toBeLessThanOrEqual(width);
    expect(edge.right).toBeLessThanOrEqual(width);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/reports/board-ux/share-my-rank-${width}.png` });
  }
  await setWidth(page, 308, 568);
  const tight = await rightEdge(page, '[data-testid="submit-panel"]');
  expect(tight.scroll).toBeLessThanOrEqual(308);
  expect(tight.right).toBeLessThanOrEqual(308);
});
