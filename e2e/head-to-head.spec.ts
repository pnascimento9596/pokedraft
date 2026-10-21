import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { HEAD_TO_HEAD, LIVE_PREFIX } from "./pins";

const SHOT = "docs/reports/head-to-head";

test.use({
  reducedMotion: "reduce",
  permissions: ["clipboard-read", "clipboard-write"],
  viewport: { width: 390, height: 844 },
});

function watchHydration(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

// Position First asks for the slot before it rolls, so the same first-open-slot, first-offer draft
// taps the slot first.
async function draftPositionFirst(page: Page): Promise<void> {
  const header = page.getByTestId("round-header");
  for (let round = 1; round <= 16; round++) {
    await expect(header).toHaveText(`Round ${round} of 16`);
    await page.locator('[data-testid^="slot-"][data-filled="false"]').first().click();
    await page.locator('[data-testid^="candidate-"]').first().click();
  }
  await expect(header).toHaveText("Draft complete");
}

async function playTo(page: Page, href: string): Promise<void> {
  await page.goto(href);
  await page.getByTestId("run-start").click();
  if (href.includes("order=positionFirst")) await draftPositionFirst(page);
  else await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("results-record")).toBeVisible();
}

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function noSideScroll(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

// The verdicts are literal: the golden-cup8 challenger loses to the golden draft, and the
// golden-kanto151 challenger beats it (records in pins.ts).
test("a challenge link on golden-cup8 shows the head-to-head, the round table and They win the seed, at 390, 360 and 320 (catches a challenge whose results never compare)", async ({
  page,
}) => {
  const errors = watchHydration(page);
  const { url, theirs, you, them } = HEAD_TO_HEAD.cup8;
  await playTo(page, `${url}&vs=${theirs}`);
  const h2h = page.getByTestId("head-to-head");
  await expect(page.getByTestId("results-record")).toHaveText(you.record);
  await expect(h2h.getByTestId("h2h-you")).toHaveText(`You${you.record}Team Score ${you.score}`);
  await expect(h2h.getByTestId("h2h-them")).toHaveText(
    `Them${them.record}Team Score ${them.score}`,
  );
  await expect(h2h.getByTestId("h2h-verdict")).toHaveText("They win the seed");
  await expect(h2h.getByRole("row")).toHaveText([
    "RoundYouThem",
    "Group match 10-03-0",
    "Group match 21-07-0",
    "Group match 30-26-1",
    "Round of 323-3 (won on pens)6-2",
    "Round of 160-12-0",
    "Quarter-finalOut2-2 (lost on pens)",
  ]);
  for (const width of [390, 360, 320]) {
    await noSideScroll(page, width);
    await h2h.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/they-win-${width}.png` });
  }
  expect(errors).toEqual([]);
});

test("a challenge link on golden-kanto151 says You win the seed at 390", async ({ page }) => {
  const { url, theirs, you, them } = HEAD_TO_HEAD.kanto151;
  await playTo(page, `${url}&vs=${theirs}`);
  const h2h = page.getByTestId("head-to-head");
  await expect(h2h.getByTestId("h2h-you")).toHaveText(`You${you.record}Team Score ${you.score}`);
  await expect(h2h.getByTestId("h2h-them")).toHaveText(
    `Them${them.record}Team Score ${them.score}`,
  );
  await expect(h2h.getByTestId("h2h-verdict")).toHaveText("You win the seed");
  await h2h.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/you-win-390.png` });
});

test("Challenge a friend and Send it back share the same-seed link with the run, and playing it draws Level on the seed (catches a dare that loses the run to beat)", async ({
  page,
}) => {
  const { url, you } = HEAD_TO_HEAD.cup8;
  await playTo(page, url);
  await expect(page.getByTestId("head-to-head")).toHaveCount(0);
  await page.getByRole("button", { name: "Challenge a friend" }).click();
  const origin = new URL(page.url()).origin;
  const dare = await clipboard(page);
  const live = LIVE_PREFIX.replace(".", "\\.");
  expect(dare).toMatch(new RegExp(`^${origin}${url.replace(/\?/g, "\\?")}&vs=${live}[\\w-]+$`));

  // This browser would reopen its own finished run on the same seed, so the friend starts clean.
  await page.evaluate(() => {
    sessionStorage.removeItem("pokedraft.run.cup8");
    localStorage.removeItem("pokedraft.run.cup8");
  });
  await playTo(page, dare);
  const h2h = page.getByTestId("head-to-head");
  await expect(h2h.getByTestId("h2h-verdict")).toHaveText("Level on the seed");
  await expect(h2h.getByTestId("h2h-them")).toHaveText(`Them${you.record}Team Score ${you.score}`);
  await h2h.getByRole("button", { name: "Send it back" }).click();
  await expect(h2h.getByRole("status")).toHaveText("Link copied");
  expect(await clipboard(page)).toBe(dare);
  await h2h.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/level-send-it-back-390.png` });
});

test("New run drops the run to beat and the seed from the address (catches a fresh seed compared with the old run)", async ({
  page,
}) => {
  const { url, theirs } = HEAD_TO_HEAD.kanto151;
  await playTo(page, `${url}&vs=${theirs}`);
  await page.getByRole("button", { name: "New run" }).click();
  await expect(page.getByTestId("run-start")).toBeVisible();
  await expect(page).toHaveURL(/\/play\?mode=kanto151&f=3-5-2&order=positionFirst$/);
});

test("a retained run to beat plays the same seed and shows only the engine line (catches an invented result for an old engine)", async ({
  page,
}) => {
  const { url, retained, you } = HEAD_TO_HEAD.kanto151;
  await playTo(page, `${url}&vs=${retained}`);
  await expect(page.getByTestId("results-record")).toHaveText(you.record);
  const h2h = page.getByTestId("head-to-head");
  await expect(h2h.getByTestId("h2h-retained")).toHaveText(
    "Their run used engine v5, so there is no side by side.",
  );
  await expect(h2h.getByRole("table")).toHaveCount(0);
  await h2h.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/retained-390.png` });
});
