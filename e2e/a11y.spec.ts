import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

// A real share token, so the shared-run page renders the full results view.
const TOKEN =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const BOARD = {
  mode: "cup8",
  scope: "daily",
  date: "2026-10-09",
  coach: "all",
  entries: [
    {
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
    },
  ],
};

// One options object. withTags() and withRules() both overwrite runOnly, so chaining them ran a
// single rule (SC-01). label-content-name-mismatch is experimental and off by default; tokens read
// "GK Name" and must be named the same, so it is switched on by id.
const AXE_OPTIONS = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
  },
  rules: {
    "label-content-name-mismatch": { enabled: true },
    "image-redundant-alt": { enabled: true },
  },
};

// Rules that must be part of every scan, so an options edit cannot shrink the run unseen.
const MUST_RUN = [
  "color-contrast",
  "target-size",
  "label-content-name-mismatch",
  "image-redundant-alt",
  "region",
];

// axe cannot score text over the pitch grass, the results hero gradient or the creature images.
// Those nodes land in "incomplete", and the manual contrast table in the audit covers them.
async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).options(AXE_OPTIONS).analyze();
  const ran = new Set(
    [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map(
      (r) => r.id,
    ),
  );
  expect(MUST_RUN.filter((id) => !ran.has(id))).toEqual([]);
  const open = results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(" ")}`),
  );
  expect(open).toEqual([]);
}

const PAGES: { name: string; open: (page: Page) => Promise<void> }[] = [
  ...["/", "/how-to-play", "/history", `/r/${TOKEN}`, "/r/garbage-not-a-token", "/nope-404"].map(
    (route) => ({
      name: route === `/r/${TOKEN}` ? "/r/<results token>" : route,
      open: async (page: Page) => {
        await page.goto(route);
        // /r/ streams its body behind a "Loading run" fallback that has no h1 yet.
        await page.getByRole("heading", { level: 1 }).first().waitFor();
      },
    }),
  ),
  {
    name: "a live 8-0 draft",
    open: async (page) => {
      await page.goto("/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=a11y");
      await page.getByTestId("run-start").click();
      await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
    },
  },
  {
    name: "the builder picker",
    open: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Empty LCB slot" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    name: "/leaderboard with rows",
    open: async (page) => {
      await page.route("**/api/leaderboard?**", (route) => route.fulfill({ json: BOARD }));
      await page.goto("/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
      await expect(page.getByTestId("board-row")).toHaveCount(1);
    },
  },
  {
    name: "/daily results with the submit panel",
    open: async (page) => {
      await page.goto("/daily");
      await page.getByTestId("run-start").click();
      await draftSixteen(page);
      await page.getByTestId("see-results").click();
      await expect(page.getByTestId("submit-panel")).toBeVisible();
    },
  },
];

// The body background of each theme, so a scan cannot silently run the wrong theme.
const BODY_BACKGROUND = { dark: "rgb(11, 18, 32)", light: "rgb(231, 234, 226)" };

for (const colorScheme of ["dark", "light"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    for (const { name, open } of PAGES) {
      test(`no axe violations on ${name}`, async ({ page }) => {
        await open(page);
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          BODY_BACKGROUND[colorScheme],
        );
        await scan(page);
      });
    }
  });
}
