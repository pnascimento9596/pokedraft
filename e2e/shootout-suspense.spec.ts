import { expect, test, type Locator, type Page } from "@playwright/test";

// Builder seed "shootout-1" (4-3-3, the engine-v4 fixture squad) under engine 6: the final goes to
// a 12-kick shootout, u+ o- u+ o+ u+ o+ u- o+ u+ o+ then sudden death u- o+.
const TOKEN =
  "pd6.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwic2hvb3RvdXQtMSIsW1sibCIsOSwiczAiXSxbImwiLDU5LCJzMSJdLFsibCIsMTQ5LCJzMiJdLFsibCIsMTMwLCJzMyJdLFsibCIsMywiczQiXSxbImwiLDgwLCJzNSJdLFsibCIsNiwiczYiXSxbImwiLDU1LCJzNyJdLFsibCIsMjYsInM4Il0sWyJsIiw4NSwiczkiXSxbImwiLDEzNSwiczEwIl0sWyJsIiwyNSwiYjAiXSxbImwiLDk0LCJiMSJdLFsibCIsNjUsImIyIl0sWyJsIiw2OCwiYjMiXSxbImwiLDE0MywiYjQiXV1d";
const SHOT = "docs/reports/shootout-suspense";
const KICK_MS = 1_200;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function toShootout(page: Page): Promise<Locator> {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto(`/r/${TOKEN}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-F").getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
  const player = replay.getByTestId("match-player");
  for (let i = 0; i < 200 && Number(await player.getAttribute("data-minute")) < 116; i++) {
    await page.clock.runFor(1_000);
  }
  for (let i = 0; i < 400 && (await player.getAttribute("data-stage")) !== "pens"; i++) {
    await page.clock.runFor(16);
  }
  await expect(player).toHaveAttribute("data-stage", "pens");
  return replay;
}

test("each shootout kick runs up, flies and gets a keeper reaction, with a sudden-death banner, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(180_000);
  const replay = await toShootout(page);
  const pitch = replay.getByTestId("broadcast");
  const ball = replay.getByTestId("broadcast-ball");
  // Kick 1 is the user's (slot-ordered sprites; the user attacks the right-hand goal).
  const taker = pitch.locator('[data-side="user"][data-hot="true"]');
  const keeper = pitch.locator('[data-side="opp"][data-slot="0"]');

  await page.clock.runFor(KICK_MS * 0.2);
  await expect(taker).toHaveAttribute("data-pose", "run");
  await expect(replay.getByTestId("pitch-trails")).toHaveCount(0);
  await page.screenshot({ path: `${SHOT}/390-kick1-run-up.png` });

  await page.clock.runFor(KICK_MS * 0.3);
  await expect(replay.getByTestId("pitch-trails")).toHaveAttribute("data-kind", "shot");
  await expect(taker).toHaveAttribute("data-pose", "cast");
  await page.screenshot({ path: `${SHOT}/390-kick1-flight.png` });

  await page.clock.runFor(KICK_MS * 0.3);
  await expect(keeper).toHaveAttribute("data-pose", "dive");
  await expect(ball).toHaveAttribute("data-effect", "impact");
  await expect(replay.getByTestId("matchday-pens")).toHaveText("Pens 1 - 0");
  await page.screenshot({ path: `${SHOT}/390-kick1-goal-reaction.png` });

  // Kick 2: the opponent's, saved by the user's keeper.
  await page.clock.runFor(KICK_MS * 0.2 + KICK_MS * 0.8);
  await expect(pitch.locator('[data-side="user"][data-slot="0"]')).toHaveAttribute(
    "data-pose",
    "dive",
  );
  await expect(ball).toHaveAttribute("data-effect", "shield");
  await page.screenshot({ path: `${SHOT}/390-kick2-save-reaction.png` });

  await expect(replay.getByTestId("sudden-death")).toHaveCount(0);
  // From the end of kick 2 to the run-up of kick 11.
  await page.clock.runFor(KICK_MS * 0.2 + KICK_MS * 8 + KICK_MS * 0.2);
  await expect(replay.getByTestId("sudden-death")).toHaveText("Sudden death");
  await page.screenshot({ path: `${SHOT}/390-kick11-sudden-death.png` });

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
