import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { ENGINE_VERSION, LIVE_PREFIX, RUN_8_0 } from "./pins";

test.use({ reducedMotion: "reduce" });

// The engine 3 golden cup8 run (e2e/layout-shift.spec.ts): seed golden-cup8, 4-2-3-1, 3-0-2.
const GOLDEN_RUN =
  "pd3.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAiLDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwxODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsicCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXV0";

const ROW = {
  mode: "cup8",
  variant: "classic3.squadFirst.g123456789",
  dailyDate: null,
  createdAt: "2026-10-16T12:00:00.000Z",
  coached: false,
  seed: "golden-cup8",
};

// Twenty capital Ws is the widest nickname the server accepts.
const ROWS = [
  {
    ...ROW,
    rank: 1,
    nickname: "W".repeat(20),
    token: `${LIVE_PREFIX}e2e-wide`,
    teamScore: 812,
    wins: 7,
    draws: 1,
    losses: 0,
    engineVersion: ENGINE_VERSION,
    formation: "3-4-2-1",
  },
  {
    ...ROW,
    rank: 2,
    nickname: "Lance",
    token: GOLDEN_RUN,
    teamScore: 593,
    wins: 3,
    draws: 0,
    losses: 2,
    engineVersion: "pokedraft-engine-3",
    formation: "4-2-3-1",
  },
  {
    ...ROW,
    rank: 3,
    nickname: "Misty",
    token: `${LIVE_PREFIX}e2e-misty`,
    teamScore: 540,
    wins: 2,
    draws: 1,
    losses: 2,
    engineVersion: ENGINE_VERSION,
    formation: "4-4-2",
  },
];

function seedReply(url: URL, entries: readonly unknown[]) {
  return {
    mode: url.searchParams.get("mode"),
    scope: "seed",
    date: null,
    coach: "all",
    engine: "all",
    seed: url.searchParams.get("seed"),
    entries,
  };
}

async function stubSeedBoard(
  page: Page,
  reply: (url: URL) => { status: number; json: unknown },
): Promise<string[]> {
  const seen: string[] = [];
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    seen.push(url.search);
    return route.fulfill(reply(url));
  });
  return seen;
}

function watchHydration(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

for (const { width, height } of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 640 },
]) {
  test(`/r lists friends on the seed, marks this run and labels engine v3 at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const hydration = watchHydration(page);
    const seen = await stubSeedBoard(page, (url) => ({ status: 200, json: seedReply(url, ROWS) }));
    await page.goto(`/r/${GOLDEN_RUN}`);
    const table = page.getByRole("table", { name: "Friends on this seed" });
    await expect(table).toBeVisible();
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveText([
      `1${"W".repeat(20)}3-4-2-17-1-0812`,
      "2LanceThis runEngine v34-2-3-13-0-2593",
      "3Misty4-4-22-1-2540",
    ]);
    expect(seen).toEqual(["?mode=cup8&seed=golden-cup8"]);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - window.innerWidth,
      table:
        (document.querySelector('[data-testid="seed-board"] table')?.parentElement?.scrollWidth ??
          0) -
        (document.querySelector('[data-testid="seed-board"] table')?.parentElement?.clientWidth ??
          0),
    }));
    expect(overflow).toEqual({ page: 0, table: 0 });
    await page.getByTestId("seed-board").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/reports/seed-boards/seed-table-${width}x${height}.png` });
    expect(hydration).toEqual([]);
  });
}

test("/r says Board unavailable when the seed board fails, never an empty table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubSeedBoard(page, () => ({
    status: 503,
    json: { error: { code: "DB_UNAVAILABLE", message: "down" } },
  }));
  await page.goto(`/r/${GOLDEN_RUN}`);
  const error = page.getByTestId("seed-board-error");
  await expect(error).toHaveText("Board unavailableThe runs on this seed could not be loaded.");
  await expect(page.getByRole("table", { name: "Friends on this seed" })).toHaveCount(0);
  await error.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/reports/seed-boards/seed-table-unavailable-390x844.png" });
});

test("/r hides the table when nobody submitted the seed", async ({ page }) => {
  const seen = await stubSeedBoard(page, (url) => ({ status: 200, json: seedReply(url, []) }));
  await page.goto(`/r/${GOLDEN_RUN}`);
  await expect(page.getByTestId("results-record")).toHaveText("3-0-2");
  await expect.poll(() => seen).toEqual(["?mode=cup8&seed=golden-cup8"]);
  await expect(page.getByTestId("seed-board")).toHaveCount(0);
});

test("/r server HTML carries no seed board, so the shared page reads no database", async ({
  request,
}) => {
  const html = await (await request.get(`/r/${GOLDEN_RUN}`)).text();
  expect(html).toContain("Team Score");
  expect(html).not.toContain("Friends on this seed");
});

test("live results ask for the drafted seed's board and list it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const seen = await stubSeedBoard(page, (url) => ({
    status: 200,
    json: seedReply(url, [ROWS[0], ROWS[2]]),
  }));
  await page.goto(RUN_8_0.url);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("results-record")).toHaveText(RUN_8_0.record);
  const table = page.getByRole("table", { name: "Friends on this seed" });
  await expect(table.locator("tbody tr")).toHaveText([
    `1${"W".repeat(20)}3-4-2-17-1-0812`,
    "3Misty4-4-22-1-2540",
  ]);
  expect(seen).toEqual(["?mode=cup8&seed=e2e-80"]);
});

test("live results show a run submitted from the page in the seed table without a reload (catches a table fetched once on mount)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const posted = {
    ...ROW,
    seed: "e2e-80",
    rank: 2,
    nickname: "Brock",
    token: `${LIVE_PREFIX}e2e-brock`,
    teamScore: 700,
    wins: 8,
    draws: 0,
    losses: 0,
    engineVersion: ENGINE_VERSION,
    formation: "4-3-3",
  };
  let submitted = false;
  const seen = await stubSeedBoard(page, (url) => ({
    status: 200,
    json: seedReply(url, submitted ? [ROWS[0], posted] : [ROWS[0]]),
  }));
  await page.route("**/api/leaderboard", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submitted = true;
    return route.fulfill({ status: 201, json: { entry: posted } });
  });
  await page.goto(RUN_8_0.url);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  const rows = page.getByRole("table", { name: "Friends on this seed" }).locator("tbody tr");
  await expect(rows).toHaveText([`1${"W".repeat(20)}3-4-2-17-1-0812`]);
  await page.getByTestId("submit-nickname").fill("Brock");
  await page.getByTestId("submit-button").click();
  await expect(page.getByTestId("submit-success")).toBeVisible();
  await expect(rows).toHaveText([`1${"W".repeat(20)}3-4-2-17-1-0812`, "2Brock4-3-38-0-0700"]);
  expect(seen).toEqual(["?mode=cup8&seed=e2e-80", "?mode=cup8&seed=e2e-80"]);
});

test("All engines shows the engine 3 run, labelled, and the default all-time board does not", async ({
  page,
}) => {
  const hydration = watchHydration(page);
  const seen = await stubSeedBoard(page, (url) => {
    const engine = url.searchParams.get("engine") ?? "current";
    return {
      status: 200,
      json: {
        mode: "cup8",
        scope: "all",
        date: null,
        coach: "all",
        engine,
        seed: null,
        entries: engine === "all" ? ROWS.slice(0, 2) : [ROWS[0]],
      },
    };
  });
  for (const { width, height } of [
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 320, height: 640 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/leaderboard?mode=cup8&scope=all");
    await expect(page.getByTestId("board-row")).toHaveCount(1);
    await expect(page.getByTestId("engine-row-label")).toHaveCount(0);
    const toggle = page.getByRole("button", { name: "All engines" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=all&engine=all$/);
    await expect(page.getByTestId("board-row")).toHaveCount(2);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("engine-row-label")).toHaveText(["Engine v3"]);
    await expect(page.getByText(/all-time, every engine\./)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBe(0);
    await page.screenshot({ path: `docs/reports/seed-boards/all-engines-${width}x${height}.png` });
  }
  expect(seen.slice(0, 2)).toEqual(["?mode=cup8&scope=all", "?mode=cup8&scope=all&engine=all"]);
  expect(hydration).toEqual([]);
});
