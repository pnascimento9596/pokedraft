import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { ENGINE_VERSION, LIVE_TOKEN } from "./pins";

test.use({ reducedMotion: "reduce" });

const ENTRY = {
  rank: 1,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  token: "pd1.e2e-one",
  teamScore: 845,
  wins: 8,
  draws: 0,
  losses: 0,
  createdAt: "2026-10-09T12:00:00.000Z",
  coached: false,
};

const SECOND = {
  ...ENTRY,
  rank: 2,
  nickname: "Brock",
  token: "pd1.e2e-two",
  teamScore: 790,
  wins: 6,
  draws: 1,
  losses: 1,
};

async function stubBoard(page: Page, status: number, body: unknown): Promise<string[]> {
  const seen: string[] = [];
  await page.route("**/api/leaderboard?**", (route) => {
    seen.push(new URL(route.request().url()).search);
    return route.fulfill({ status, json: body });
  });
  return seen;
}

test("the daily run completes on /daily and its submission posts the token and shows the rank", async ({
  page,
}) => {
  let posted: unknown = null;
  await page.route("**/api/leaderboard", (route) => {
    posted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { entry: { ...ENTRY, rank: 4 } } });
  });

  await page.goto("/daily");
  await expect(page.getByTestId("daily-kicker")).toContainText("Daily challenge");
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("results-record")).toBeVisible();
  await expect(page.getByRole("button", { name: "New run" })).toHaveCount(0);

  const panel = page.getByTestId("submit-panel");
  await expect(panel).toContainText("Submit to today's daily board");
  await page.getByTestId("submit-nickname").fill("  Misty ");
  await page.getByTestId("submit-button").click();
  await expect(page.getByTestId("submit-success")).toHaveText(
    "#4Misty is on the daily board, among uncoached runs.",
  );

  expect(posted).toMatchObject({
    nickname: "Misty",
    engineVersion: ENGINE_VERSION,
    coach: "uncoached",
  });
  expect((posted as { token: string }).token).toMatch(LIVE_TOKEN);
  await expect(page.getByRole("link", { name: "View leaderboard" })).toHaveAttribute(
    "href",
    "/leaderboard?mode=cup8&scope=daily&date=2026-10-09&coach=uncoached",
  );
});

test("a copy of a listed run is refused with the nickname it is listed under, at 390x844", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/leaderboard", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: {
          code: "DUPLICATE_TOKEN",
          message: "This exact run is already on the board.",
          nickname: "Misty",
        },
      },
    }),
  );

  await page.goto("/daily");
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("submit-nickname").fill("Brock");
  await page.getByTestId("submit-button").click();
  const error = page.getByTestId("submit-error");
  await expect(error).toHaveText("This exact run is already on the board, listed under Misty.");
  await expect(page.getByTestId("submit-success")).toHaveCount(0);
  await error.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/reports/leaderboard-integrity/duplicate-run-390x844.png" });
});

test("/leaderboard renders the stubbed rows and each links to its /r/ replay", async ({ page }) => {
  const seen = await stubBoard(page, 200, {
    mode: "cup8",
    scope: "daily",
    date: "2026-10-09",
    coach: "all",
    entries: [ENTRY, SECOND],
  });
  await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
  const rows = page.getByTestId("board-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Misty");
  await expect(rows.nth(0)).toContainText("8-0-0");
  await expect(rows.nth(0).getByRole("link")).toHaveAttribute("href", "/r/pd1.e2e-one");
  await expect(rows.nth(1).getByRole("link")).toHaveAttribute("href", "/r/pd1.e2e-two");
  expect(seen).toContain("?mode=cup8&scope=daily&date=2026-10-09");

  await page.getByRole("tab", { name: "All-time" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=all$/);
  await page.getByRole("radio", { name: "151 Challenge" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=kanto151&scope=all$/);
  await expect.poll(() => seen).toContain("?mode=kanto151&scope=all");
});

test("pressing Uncoached asks the server for coach=uncoached and shows the rows it sends", async ({
  page,
}) => {
  const seen: string[] = [];
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    seen.push(url.search);
    const coach = url.searchParams.get("coach") ?? "all";
    const entries =
      coach === "uncoached"
        ? [{ ...SECOND, rank: 1, nickname: "Plain", token: "pd1.e2e-plain" }]
        : [{ ...ENTRY, coached: true }];
    return route.fulfill({
      json: { mode: "cup8", scope: "all", date: null, coach, entries },
    });
  });
  await page.goto("/leaderboard?mode=cup8&scope=all");
  await expect(page.getByTestId("board-row")).toHaveCount(1);
  await expect(page.getByTestId("coached-chip")).toHaveCount(1);

  await page.getByTestId("coach-filter-uncoached").click();
  const rows = page.getByTestId("board-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("Plain");
  await expect(rows.nth(0).getByRole("link")).toHaveAttribute("href", "/r/pd1.e2e-plain");
  await expect(page.getByTestId("coached-chip")).toHaveCount(0);
  await expect(page.getByTestId("coach-filter-uncoached")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/leaderboard\?mode=cup8&scope=all&coach=uncoached$/);
  expect(seen).toEqual(["?mode=cup8&scope=all", "?mode=cup8&scope=all&coach=uncoached"]);
});

test("a /leaderboard link with coach=uncoached opens the Uncoached view and keeps it across board switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const seen: string[] = [];
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    seen.push(url.search);
    const coach = url.searchParams.get("coach") ?? "all";
    return route.fulfill({
      json: {
        mode: url.searchParams.get("mode"),
        scope: url.searchParams.get("scope"),
        date: url.searchParams.get("date"),
        coach,
        entries: [{ ...SECOND, rank: 1, nickname: "Plain", token: "pd1.e2e-plain" }],
      },
    });
  });
  await page.goto("/leaderboard?mode=cup8&scope=all&coach=uncoached");
  await expect(page.getByTestId("board-row")).toHaveCount(1);
  await expect(page.getByTestId("coach-filter-uncoached")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("coach-filter-all")).toHaveAttribute("aria-pressed", "false");
  expect(seen).toEqual(["?mode=cup8&scope=all&coach=uncoached"]);
  await page.screenshot({
    path: "docs/reports/security-integrity-quick-fixes/leaderboard-coach-url-390x844.png",
  });

  await page.getByRole("radio", { name: "151 Challenge" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=kanto151&scope=all&coach=uncoached$/);
  await expect.poll(() => seen).toContain("?mode=kanto151&scope=all&coach=uncoached");

  await page.getByTestId("coach-filter-all").click();
  await expect(page).toHaveURL(/\/leaderboard\?mode=kanto151&scope=all$/);
  await expect(page.getByTestId("coach-filter-all")).toHaveAttribute("aria-pressed", "true");
});

test("a 503 from the board API shows the error state, never an empty board", async ({ page }) => {
  await stubBoard(page, 503, { error: { code: "DB_UNAVAILABLE", message: "down" } });
  await page.goto("/leaderboard?mode=cup8&scope=all");
  await expect(page.getByTestId("board-error")).toBeVisible();
  await expect(page.getByTestId("board-empty")).toHaveCount(0);
  await expect(page.getByTestId("board")).toHaveCount(0);
});

// html and body clip sideways overflow, so scrollWidth hides a clipped header. Measure the
// right edge of every element instead.
function widestRight(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(
      ...[...document.body.querySelectorAll("*")].map((el) => el.getBoundingClientRect().right),
    ),
  );
}

for (const width of [390, 1440]) {
  test(`/daily start and /leaderboard fit a ${width}px viewport without sideways scroll`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await stubBoard(page, 200, {
      mode: "cup8",
      scope: "daily",
      date: "2026-10-09",
      coach: "all",
      entries: [ENTRY, SECOND],
    });

    await page.goto("/daily");
    await expect(page.getByTestId("run-start")).toBeVisible();
    expect(await widestRight(page)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`daily-${width}.png`), fullPage: true });

    await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
    await expect(page.getByTestId("board-row")).toHaveCount(2);
    expect(await widestRight(page)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`leaderboard-${width}.png`), fullPage: true });
  });
}
