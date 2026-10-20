import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V3 } from "../src/engine/versions/__tests__/fixtures";
import { skipManaged } from "./helpers";
import { EXHIBITION_BROADCAST as PIN, EXHIBITION_ROUTE } from "./pins";
import { expectPitchClear, sideScroll, smallControls } from "./touchline-helpers";

// Row 5c2: one exhibition match plays on the Broadcast with the touchline in manager mode; two legs
// play on the Broadcast with no manager stop.

const PROOF = "docs/reports/exhibition-broadcast";
const ROUTE = `/exhibition?away=${GOLDEN_CUP8_V3}`;

// The route spec's Builder friendly of Pokedex 1 to 16, the newest saved run, so it is the home side.
const FRIENDLY = {
  token: EXHIBITION_ROUTE.friendly,
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
};

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function seed(page: Page, managerMode: boolean): Promise<void> {
  await page.addInitScript(
    ({ runs, panel }) => {
      if (sessionStorage.getItem("seeded") !== null) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
      localStorage.setItem("pokedraft:panel", JSON.stringify(panel));
    },
    { runs: [FRIENDLY], panel: { managerMode, matchView: managerMode ? "live" : "quick" } },
  );
}

/** Answers injury stops with the assistant's pick until the half-time stop shows. */
async function untilHalfTime(page: Page): Promise<void> {
  const halftime = page.getByTestId("stop-halftime");
  const injury = page.getByTestId("stop-injury");
  for (let i = 0; i < 12; i++) {
    await expect(halftime.or(injury)).toBeVisible({ timeout: 40_000 });
    if (await halftime.isVisible()) return;
    await page.getByTestId("injury-confirm").tap();
  }
  throw new Error("no half-time stop");
}

async function setWidth(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
}

// The widest right edge of anything inside `selector` outside `skip`, and the page's scroll width.
// A box that clips its overflow (the pitch, the ticker) caps what is inside it: a sprite running
// past the touchline is cut off by the pitch, not drawn past the screen edge.
async function rightEdge(page: Page, selector: string, skip: string | null) {
  return page.evaluate(
    ({ sel, skip }) => {
      let right = 0;
      let unclipped = 0;
      for (const root of document.querySelectorAll(sel)) {
        for (const el of [root, ...root.querySelectorAll("*")]) {
          if (skip !== null && el.closest(skip) !== null) continue;
          const own = el.getBoundingClientRect().right;
          let edge = own;
          for (let p = el.parentElement; p !== null && p !== document.body; p = p.parentElement) {
            if (getComputedStyle(p).overflowX !== "visible") {
              edge = Math.min(edge, p.getBoundingClientRect().right);
            }
          }
          right = Math.max(right, edge);
          unclipped = Math.max(unclipped, own);
        }
      }
      return { right, unclipped, scroll: document.documentElement.scrollWidth };
    },
    { sel: selector, skip },
  );
}

const SHEET = '[data-testid="touchline-sheet"]';

// Hosted CI fonts run a few px wider than macOS, so 320 keeps 12 px of headroom and the same
// content must still fit at 308. The touchline sheet's content keeps the same 12 px.
async function fitsWithHeadroom(page: Page, label: string, height: number) {
  for (const width of [320, 308]) {
    await setWidth(page, width, height);
    const edge = await rightEdge(page, "main > *", SHEET);
    const sheet = await rightEdge(page, '[data-testid="touchline"] > *', null);
    console.log(
      `${label} at ${width}px: right edge ${edge.right.toFixed(1)} (unclipped ${edge.unclipped.toFixed(1)}), sheet content ${sheet.right.toFixed(1)}, scroll ${edge.scroll}`,
    );
    expect(edge.scroll).toBeLessThanOrEqual(width);
    expect(edge.right).toBeLessThanOrEqual(308);
    expect(sheet.right).toBeLessThanOrEqual(width - 12);
  }
}

for (const [width, height] of [
  [390, 844],
  [360, 780],
  [320, 640],
] as const) {
  test.describe(`at ${width}x${height} with touch`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test(`manager mode: the half-time stop appears, a sub confirms there and is in the full-time result (catches an exhibition with no manager controls)`, async ({
      page,
    }) => {
      test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
      test.setTimeout(180_000);
      const errors = watchConsole(page);
      await seed(page, true);
      await page.goto(ROUTE);
      const main = page.getByRole("main");
      await expect(main.getByTestId("exhibition-manager-note")).toHaveText(
        "Manager controls in one match only.",
      );
      await expect(main.getByTestId("match-player")).toHaveCount(0);
      await main.getByTestId("exhibition-kickoff").tap();
      await expect(page.getByTestId("broadcast")).toBeVisible();
      await expect(page.getByTestId("match-player")).toHaveAttribute("data-view", "live");
      await page.getByTestId("speed-toggle").tap();

      await untilHalfTime(page);
      const sheet = page.getByTestId("touchline-sheet");
      await expect(page.getByTestId("touchline-minute")).toHaveText("45'");
      await expect(sheet.getByTestId("stop-go")).toBeVisible();
      await expectPitchClear(page);
      expect(await smallControls(sheet)).toEqual([]);
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${PROOF}/${width}-halftime-stop.png` });

      await page.getByTestId("sheet-toggle").tap();
      await expect(page.getByTestId("sub-confirm")).toBeVisible();
      await expect(page.getByTestId("subs-count")).toHaveText("Subs 0 of 5");
      await page.getByTestId("sub-confirm").tap();
      await expect(page.getByTestId("subs-count")).toHaveText("Subs 1 of 5");
      await expect(page.getByTestId("ticker")).toContainText(PIN.sub);
      await page.screenshot({ path: `${PROOF}/${width}-sub-made.png` });
      await sheet.getByTestId("stop-go").tap();
      await expect(page.getByTestId("stop-halftime")).toHaveCount(0);

      await skipManaged(page);
      await expect(page.getByTestId("match-player")).toHaveAttribute("data-stage", "done");
      await expect(main.getByTestId("exhibition-score")).toHaveText(PIN.withSub);
      await expect(page.getByTestId("matchday-score")).toHaveText(PIN.withSub);
      await expect(page.getByTestId("touchline-sheet")).toHaveCount(0);
      const fulltime = main.getByTestId("exhibition-fulltime");
      await fulltime.scrollIntoViewIfNeeded();
      expect(await sideScroll(page)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${PROOF}/${width}-fulltime.png` });
      expect(await page.evaluate(() => localStorage.getItem("pokedraft:history:v1"))).toBe(
        JSON.stringify([FRIENDLY]),
      );
      expect(errors).toEqual([]);
    });
  });
}

test.describe("at 390x844 with touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("two legs in manager mode play on the Broadcast with no stop and no touchline (catches a leg-one decision moving the tie-break seed)", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    const errors = watchConsole(page);
    await seed(page, true);
    await page.goto(`${ROUTE}&legs=2`);
    const main = page.getByRole("main");
    await main.getByTestId("exhibition-kickoff").tap();
    await expect(page.getByTestId("broadcast")).toBeVisible();
    await expect(page.getByTestId("match-player")).toHaveAttribute("data-view", "live");
    await expect(page.getByTestId("touchline-sheet")).toHaveCount(0);
    await page.getByTestId("skip-ft").tap();
    await expect(page.getByTestId("skip-warning")).toHaveCount(0);
    await expect(main.getByTestId("exhibition-leg-1-score")).toBeVisible();
    await main.getByRole("button", { name: "Play leg 2" }).tap();
    await expect(main.getByRole("region", { name: "Leg 2", exact: true })).toBeVisible();
    await expect(page.getByTestId("touchline-sheet")).toHaveCount(0);
    await page.getByTestId("skip-ft").tap();
    await expect(main.getByTestId("exhibition-aggregate")).toBeVisible();
    await main.getByTestId("exhibition-fulltime").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${PROOF}/390-two-legs.png` });
    expect(errors).toEqual([]);
  });

  test("manager mode off: one match plays like a sim with no touchline", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await seed(page, false);
    await page.goto(ROUTE);
    await page.getByTestId("exhibition-kickoff").tap();
    await expect(page.getByTestId("match-player")).toHaveAttribute("data-view", "quick");
    await expect(page.getByTestId("touchline-sheet")).toHaveCount(0);
    await page.getByTestId("skip-ft").tap();
    await expect(page.getByTestId("skip-warning")).toHaveCount(0);
    await expect(page.getByTestId("exhibition-score")).toHaveText(PIN.assistant);
  });
});

test("the managed exhibition keeps 12 px of headroom at 320 and fits at 308 before kick off, at the stop and at full time, in both themes", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  test.setTimeout(180_000);
  await seed(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE);
  await fitsWithHeadroom(page, "before kick off", 640);
  await setWidth(page, 390, 844);
  await page.getByTestId("exhibition-kickoff").click();
  await page.getByTestId("speed-toggle").click();
  const halftime = page.getByTestId("stop-halftime");
  for (let i = 0; i < 12 && !(await halftime.isVisible()); i++) {
    await expect(halftime.or(page.getByTestId("stop-injury"))).toBeVisible({ timeout: 40_000 });
    if (await page.getByTestId("stop-injury").isVisible())
      await page.getByTestId("injury-confirm").click();
  }
  await fitsWithHeadroom(page, "half-time stop", 640);
  await setWidth(page, 390, 844);
  await page.getByTestId("stop-go").click();
  await skipManaged(page);
  await expect(page.getByTestId("exhibition-score")).toHaveText(PIN.assistant);
  await fitsWithHeadroom(page, "full time", 640);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of [
      [390, 844],
      [360, 780],
      [320, 640],
    ] as const) {
      await setWidth(page, width, height);
      await page.getByTestId("exhibition-fulltime").scrollIntoViewIfNeeded();
      // Buttons ease their colours after a theme switch; shoot the settled colours.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a instanceof CSSTransition)
            .map((a) => a.finished.catch(() => undefined)),
        ),
      );
      await page.screenshot({ path: `${PROOF}/fulltime-${width}-${theme}.png` });
    }
  }
});
