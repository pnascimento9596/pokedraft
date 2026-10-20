import { expect, test, type Locator, type Page } from "@playwright/test";
import { FATIGUE } from "./pins";

// A builder squad pressing all match with Magikarp (STA 19) in slot 2. e2e/pins.ts encodes it for
// the live engine and finds the first extra-time minute where exactly one player is spent and one
// more is tired, so an engine bump replays this squad on the new engine instead of a retained
// bundle.
const TOKEN = FATIGUE.token;
const SPENT = FATIGUE.spent;
const TIRED = FATIGUE.tired;
const SHOT = "docs/reports/fatigue";
const FRAME = 16;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});

async function toMinute(page: Page, player: Locator, minute: number): Promise<void> {
  for (let i = 0; i < 400 && Number(await player.getAttribute("data-minute")) < minute - 1; i++) {
    await page.clock.runFor(1_000);
  }
  for (let i = 0; i < 400 && Number(await player.getAttribute("data-minute")) < minute; i++) {
    await page.clock.runFor(FRAME);
  }
  await expect(player).toHaveAttribute("data-minute", String(minute));
}

test("a tired player sweats and a spent one shows a stamina arc late in extra time, at 390px (catches tired players looking fresh)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(240_000);
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto(`/r/${TOKEN}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${FATIGUE.round}`).getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  const pitch = replay.getByTestId("broadcast");
  await expect(pitch).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
  const player = replay.getByTestId("match-player");
  await toMinute(page, player, FATIGUE.minute);

  const spent = pitch.locator(`[data-side="user"][data-slot="${SPENT}"]`);
  await expect(spent).toHaveAttribute("data-tired", "true");
  await expect(spent.getByTestId(`pitch-sweat-user-${SPENT}`)).toBeVisible();
  await expect(spent.getByTestId(`pitch-stamina-user-${SPENT}`)).toBeVisible();
  const tired = pitch.locator(`[data-side="user"][data-slot="${TIRED}"]`);
  await expect(tired.getByTestId(`pitch-sweat-user-${TIRED}`)).toBeVisible();
  await expect(tired.getByTestId(`pitch-stamina-user-${TIRED}`)).toHaveCount(0);
  await expect(pitch.locator('[data-testid^="pitch-stamina-"]')).toHaveCount(1);
  await expect(pitch.locator('[data-side="opp"] [data-testid^="pitch-sweat-"]')).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await pitch.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390-tired-and-spent.png` });
  const box = await spent.boundingBox();
  expect(box).not.toBeNull();
  const arc = await spent.getByTestId(`pitch-stamina-user-${SPENT}`).boundingBox();
  expect(arc!.width).toBeGreaterThan(20);
  await page.screenshot({
    path: `${SHOT}/390-spent-close.png`,
    clip: { x: box!.x - 50, y: box!.y - 40, width: box!.width + 100, height: box!.height + 80 },
  });
});
