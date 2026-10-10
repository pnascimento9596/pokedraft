import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// A real share token, so the shared-run page renders the full results view.
const TOKEN =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

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
  },
};

// Rules that must be part of every scan, so an options edit cannot shrink the run unseen.
const MUST_RUN = ["color-contrast", "target-size", "label-content-name-mismatch", "region"];

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
  expect(
    results.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(" ")}`),
    ),
  ).toEqual([]);
}

const ROUTES = [
  "/",
  "/play?mode=builder&formation=4-3-3&gens=1",
  "/how-to-play",
  "/history",
  `/r/${TOKEN}`,
  "/r/garbage-not-a-token",
  "/nope-404",
];

// The body background of each theme, so a scan cannot silently run the wrong theme.
const BODY_BACKGROUND = { dark: "rgb(8, 19, 14)", light: "rgb(238, 244, 239)" };

for (const colorScheme of ["dark", "light"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    for (const route of ROUTES) {
      test(`no axe violations on ${route === `/r/${TOKEN}` ? "/r/<results token>" : route}`, async ({
        page,
      }) => {
        await page.goto(route);
        // /r/ streams its body behind a "Loading run" fallback that has no h1 yet.
        await page.getByRole("heading", { level: 1 }).first().waitFor();
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          BODY_BACKGROUND[colorScheme],
        );
        await scan(page);
      });
    }
  });
}
