import { expect, test, type Page } from "@playwright/test";
import { GIANT_KILLER, LIVE_PREFIX } from "./pins";

// A bot-drafted cup8 run on the live engine that earns Hat-trick hero, Comeback and Giant killer
// (e2e/pins.ts searches scripts/audit/tokens.mts botCup8Token("achievements-<n>") for it).

const HISTORY = [
  {
    token: `${LIVE_PREFIX}e2e-achievements-newer`,
    bucket: "cup8:open",
    friendly: false,
    formation: "3-5-2",
    score: 801,
    wins: 7,
    draws: 0,
    losses: 1,
    finish: "champion",
    flawless: false,
    at: "2026-10-21T12:00:00.000Z",
    achievements: ["hat-trick-hero", "giant-killer"],
  },
  {
    token: "pd3.e2e-achievements-older",
    bucket: "cup8:open",
    friendly: false,
    formation: "4-3-3",
    score: 820,
    wins: 8,
    draws: 0,
    losses: 0,
    finish: "champion",
    flawless: true,
    at: "2026-10-14T12:00:00.000Z",
  },
];

const PROOF = "docs/reports/achievements";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

// Results pages mount the seed board, and the local server has no database. An empty board keeps
// its 503 out of the console these tests read.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/leaderboard?**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        mode: url.searchParams.get("mode"),
        scope: "seed",
        date: null,
        coach: "all",
        engine: "all",
        seed: url.searchParams.get("seed"),
        entries: [],
      },
    });
  });
});

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const width of [390, 360, 320]) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`achievements at ${width} ${theme}`, () => {
      test.use({ viewport: { width, height: 844 }, reducedMotion: "reduce", colorScheme: theme });

      test("the history grid shows six tiles, earned dates, Not yet and the formation progress", async ({
        page,
      }) => {
        const errors = watchConsole(page);
        await page.addInitScript((runs) => {
          if (sessionStorage.getItem("seeded") !== null) return;
          sessionStorage.setItem("seeded", "1");
          localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
        }, HISTORY);
        await page.goto("/history");
        const grid = page.getByRole("region", { name: "Achievements" });
        await expect(grid.getByRole("listitem")).toHaveText([
          "First FlawlessEarned 14 October 2026",
          "Hat-trick heroEarned 21 October 2026",
          "Champion with every formationNot yet2 of 8",
          "151 championNot yet",
          "ComebackNot yet",
          "Giant killerEarned 21 October 2026",
        ]);
        await expect(grid).toContainText(
          "Hat-trick hero, Comeback and Giant killer count runs played from 20 October 2026.",
        );
        const earned = await grid
          .getByTestId("achievement-giant-killer")
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        const locked = await grid
          .getByTestId("achievement-comeback")
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(earned).toBe(theme === "light" ? "rgb(244, 215, 122)" : "rgb(46, 36, 16)");
        expect(locked).not.toBe(earned);
        await noOverflow(page);
        await grid.scrollIntoViewIfNeeded();
        await grid.screenshot({ path: `${PROOF}/grid-${width}-${theme}.png` });
        expect(errors).toEqual([]);
      });

      test("a shared run shows its most notable earn as a chip beside the finish", async ({
        page,
      }) => {
        const errors = watchConsole(page);
        await page.goto(`/r/${GIANT_KILLER.token}`);
        const chip = page.getByTestId("results-achievement");
        await expect(chip).toHaveText(`Achievement: ${GIANT_KILLER.chip}`);
        await expect(chip).toBeVisible();
        const box = (await chip.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await noOverflow(page);
        await page.screenshot({ path: `${PROOF}/chip-${width}-${theme}.png` });
        expect(errors).toEqual([]);
      });
    });
  }
}

test.describe("live results", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("live results show the chip, store the run's earns and the history grid shows them", async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem(
        "pokedraft.run.cup8",
        JSON.stringify({ screen: "results", token, daily: null }),
      );
    }, GIANT_KILLER.token);
    await page.goto(GIANT_KILLER.url);
    await expect(page.getByTestId("results-achievement")).toHaveText(
      `Achievement: ${GIANT_KILLER.chip}`,
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("pokedraft:history:v1") ?? "[]")[0]?.achievements ??
            null,
        ),
      )
      .toEqual(GIANT_KILLER.earned);
    await page.goto("/history");
    const grid = page.getByRole("region", { name: "Achievements" });
    await expect(grid.getByTestId("achievement-giant-killer")).toHaveAttribute(
      "data-earned",
      "true",
    );
    await expect(grid.getByTestId("achievement-comeback")).toHaveAttribute("data-earned", "true");
    await expect(grid.getByTestId("achievement-first-flawless")).toHaveAttribute(
      "data-earned",
      "false",
    );
    expect(errors).toEqual([]);
  });

  test("the chip shifts no layout on a shared run", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "layout-shift entries are Chromium only");
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[]) {
          w.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`/r/${GIANT_KILLER.token}`);
    await expect(page.getByTestId("results-achievement")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });
});

test("a new card URL renders the chip through satori", async ({ request }) => {
  const response = await request.get(`/card?t=${GIANT_KILLER.token}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(`${PROOF}/card-giant-killer.png`, await response.body());
});
