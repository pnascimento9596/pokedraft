import { expect, test, type Page } from "@playwright/test";

// A full 4-3-3 builder lineup shared as /?b=<token> (run token version 3): Machamp in goal, then
// Zamazenta, Koraidon, Lugia and Cobalion at the back, Dialga, Mewtwo and Palkia in midfield,
// Crabominable (a 12-letter name) at LW, Magikarp at ST, Zeraora at RW, and Meowth, Psyduck,
// Mankey, Growlithe and Poliwag on the bench. Keepers, wingers and strikers carry the longest
// rating labels.
const LINEUP =
  "pd3.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwicHJvb2Ytc3RyZXNzIixbWyJsIiw2OCwiczAiXSxbImwiLDg4OSwiczEiXSxbImwiLDEwMDcsInMyIl0sWyJsIiwyNDksInMzIl0sWyJsIiw2MzgsInM0Il0sWyJsIiw0ODMsInM1Il0sWyJsIiwxNTAsInM2Il0sWyJsIiw0ODQsInM3Il0sWyJsIiw3NDAsInM4Il0sWyJsIiwxMjksInM5Il0sWyJsIiw4MDcsInMxMCJdLFsibCIsNTIsImIwIl0sWyJsIiw1NCwiYjEiXSxbImwiLDU2LCJiMiJdLFsibCIsNTgsImIzIl0sWyJsIiw2MCwiYjQiXV1d";

// Show ratings is a home-panel setting kept in localStorage.
async function ratingsOn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true }));
    } catch {
      // Without storage the lineup renders with ratings off and the assertions below fail loudly.
    }
  });
}

async function openLineup(page: Page): Promise<void> {
  await ratingsOn(page);
  await page.goto(`/?b=${LINEUP}`);
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  await expect(page.getByTestId("slot-s0")).toContainText(/Machamp.*\d/);
  await page.evaluate(() => document.fonts.ready);
}

// Every pair of pitch tokens whose visible parts (picture, slot code, name, rating pill) overlap by
// more than a pixel both ways. A token's parts are its direct child spans.
async function overlappingTokens(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tokens = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="pitch"] button[data-slot-key]'),
    ];
    const parts = tokens.map((t) => ({
      label: t.getAttribute("aria-label") ?? "",
      rects: [...t.children]
        .filter((c) => c.tagName === "SPAN")
        .map((c) => c.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0),
    }));
    const hits = new Set<string>();
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        for (const a of parts[i]!.rects) {
          for (const b of parts[j]!.rects) {
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (w > 1 && h > 1) hits.add(`${parts[i]!.label} / ${parts[j]!.label}`);
          }
        }
      }
    }
    return [...hits];
  });
}

test.describe("builder with Show ratings on, 390 px wide", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });

  // The rating pill was two or three lines ("34 / vs other / wingers"), 16 px taller than the old
  // "CM 96" pill. At 390 px it put Koraidon's and Lugia's pills on the keeper and Dialga's pill on
  // both centre-backs.
  test("no two pitch tokens overlap", async ({ page }) => {
    await openLineup(page);
    expect(await overlappingTokens(page)).toEqual([]);
  });
});

test.describe("builder picker with Show ratings on, 320 px wide", () => {
  test.use({
    viewport: { width: 320, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });

  // The rating cell grew from 48 px to 70 px ("vs other strikers" on one line). Next to the Swap
  // tag that left "Meowth" 42 px of room for 50 px of text, so it was cut to "Meo...".
  test("a row that carries the Swap tag leaves its name untruncated", async ({ page }) => {
    await openLineup(page);
    await page.getByTestId("slot-s9").click();
    await page.getByRole("searchbox").fill("Meowth");
    const row = page.getByTestId("pick-52");
    await expect(row).toContainText("Swap with SUB 1");
    const name = await row
      .getByText("Meowth", { exact: true })
      .evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
  });
});
