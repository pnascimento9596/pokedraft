import { expect, test, type Page } from "@playwright/test";
import { DEEP_LINK } from "./pins";

const SHOT = "docs/reports/replay-deep-links";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const fitsWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("a goal link opens the shared run in that match a minute before the goal, then plays it in (catches a link that lands on the plain results page)", async ({
  page,
}) => {
  await page.goto(DEEP_LINK.href);
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("match-replay-title")).toContainText(DEEP_LINK.opponent);
  const player = replay.getByTestId("match-player");
  const first = Number(await player.getAttribute("data-minute"));
  expect(first).toBeGreaterThanOrEqual(DEEP_LINK.minute - 1);
  expect(first).toBeLessThanOrEqual(DEEP_LINK.minute);
  await expect(replay.getByTestId("matchday-score")).toHaveText(DEEP_LINK.before);
  await expect(replay.getByTestId("matchday-score")).toHaveText(DEEP_LINK.after, {
    timeout: 10_000,
  });
  expect(await fitsWidth(page)).toBe(true);
});

test("deep link with at=abc renders the normal shared run with no match open", async ({ page }) => {
  await page.goto(DEEP_LINK.href.replace(/at=\d+$/, "at=abc"));
  await expect(page.getByTestId("results-record")).toBeVisible();
  await expect(page.getByTestId("match-replay")).toHaveCount(0);
});

test("the instant replay shows the REPLAY bug and Skip replay hands back the live clock", async ({
  page,
}) => {
  await page.goto(DEEP_LINK.href);
  const replay = page.getByTestId("match-replay");
  const bug = replay.getByTestId("instant-replay");
  await expect(bug).toBeVisible({ timeout: 10_000 });
  await expect(bug).toContainText("REPLAY");
  await expect(replay.getByTestId("match-player")).toHaveAttribute(
    "data-minute",
    String(DEEP_LINK.minute),
  );
  const skip = bug.getByTestId("replay-skip");
  const box = await skip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${SHOT}/instant-replay-390.png` });
  await skip.click();
  await expect(bug).toHaveCount(0);
  await expect
    .poll(async () => Number(await replay.getByTestId("match-player").getAttribute("data-minute")))
    .toBeGreaterThan(DEEP_LINK.minute);
});

test("after full time a goal pip seeks to a minute before the goal, and the group table shows the provisional standings", async ({
  page,
}) => {
  await page.goto(`/r/${DEEP_LINK.token}`);
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await replay.getByTestId("skip-ft").click();
  await expect(replay.getByTestId("match-player")).toHaveAttribute("data-stage", "done");

  const pip = replay.getByRole("button", { name: `Watch the ${DEEP_LINK.minute}' goal` });
  const box = await pip.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await pip.click();
  // The clock runs on from the seek, so the first read may already be a minute later.
  const landed = Number(await replay.getByTestId("match-player").getAttribute("data-minute"));
  expect([DEEP_LINK.minute - 1, DEEP_LINK.minute]).toContain(landed);
  await expect(replay.getByTestId("matchday-score")).toHaveText(DEEP_LINK.before);

  const standings = replay.getByTestId("replay-standings");
  await standings.locator("summary").click();
  await expect(standings.locator("tbody tr")).toHaveCount(4);
  await expect(standings).toContainText("Your team");
  await standings.scrollIntoViewIfNeeded();
  expect(await fitsWidth(page)).toBe(true);
  await page.screenshot({ path: `${SHOT}/standings-390.png` });
});

test("with sound on, a goal link offers Tap for sound, since the page opened without a tap", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("pokedraft:sound", "true"));
  await page.goto(DEEP_LINK.href);
  const tap = page.getByTestId("tap-for-sound");
  await expect(tap).toBeVisible();
  expect((await tap.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await tap.click();
  await expect(tap).toHaveCount(0);
});
