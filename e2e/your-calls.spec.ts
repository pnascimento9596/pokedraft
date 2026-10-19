import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { YOUR_CALLS } from "./pins";

// Row 3h: at full time of a coached match, the card compares the assistant's score with the
// player's and names the call that moved it most.

const SHOT = "docs/reports/your-calls";

async function toMatchday(page: Page): Promise<void> {
  await page.addInitScript(
    (value) => {
      if (localStorage.getItem("pokedraft:panel") === null)
        localStorage.setItem("pokedraft:panel", JSON.stringify(value));
    },
    { managerMode: true, matchView: "live" },
  );
  await page.goto(YOUR_CALLS.url);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("prematch")).toBeVisible();
}

/** Answers injury stops with the assistant's pick until the half-time stop shows. */
async function untilHalfTime(page: Page): Promise<void> {
  const wanted = page.getByTestId("stop-halftime");
  const injury = page.getByTestId("stop-injury");
  for (let i = 0; i < 12; i++) {
    await expect(wanted.or(injury)).toBeVisible({ timeout: 40_000 });
    if (await wanted.isVisible()) return;
    await page.getByTestId("injury-confirm").click();
  }
  throw new Error("no half-time stop");
}

test("Attack at the 45' stop: the full-time card reads the assistant's score, yours and the Attack switch (catches a card before full time or a wrong call)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await toMatchday(page);
  await page.getByTestId("prematch-go").click();
  await page.getByTestId("speed-toggle").click();

  await untilHalfTime(page);
  await expect(page.getByTestId("touchline-minute")).toHaveText("45'");
  await page.getByTestId("tactic-attack").click();
  await expect(page.getByTestId("tactic-attack")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("your-calls")).toHaveCount(0);
  await page.getByTestId("stop-go").click();
  await expect(page.getByTestId("your-calls")).toHaveCount(0);

  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("your-calls-score")).toHaveText(
    `Assistant ${YOUR_CALLS.assistant}, You ${YOUR_CALLS.you}`,
  );
  await expect(page.getByTestId("your-calls-call")).toHaveText(
    "Biggest swing: your Attack switch at 45'.",
  );
  await expect(page.getByTestId("your-calls-later")).toHaveText(
    "Later results are the same without your calls here.",
  );
  const card = page.getByTestId("your-calls");
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
  await page.getByTestId("fulltime").screenshot({ path: `${SHOT}/390-fulltime-card.png` });
  await page.screenshot({ path: `${SHOT}/390-fulltime.png` });

  // The next match has no call of the player's, so its full time has no card.
  await page.getByTestId("fulltime-next").click();
  await page.getByTestId("prematch-go").click();
  await page.getByTestId("skip-ft").click();
  await expect(page.getByTestId("fulltime")).toBeVisible();
  await expect(page.getByTestId("your-calls")).toHaveCount(0);
});
