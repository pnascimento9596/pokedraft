import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/continuous-ball";
const BOUNDS_SHOT = "docs/reports/motion-bounds";

interface Sample {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  /** Bumps at each instant replay's start and end, which cut away from the live ball. */
  readonly cut: number;
}

/** Records the ball's spot on every animation frame into `window.samples`. */
async function sampleBall(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { samples: Sample[] };
    w.samples = [];
    let cut = 0;
    let replaying = false;
    // The ball's spot in percent of the pitch. The frame loop writes it as a transform in units
    // of the pitch width, where the pitch is 64 units tall; builds before it wrote left and top.
    const spot = (ball: HTMLElement) => {
      const moved = /translate3d\(([-\d.]+)cqi, ([-\d.]+)cqi/.exec(ball.style.transform);
      if (moved !== null) return { x: Number(moved[1]), y: Number(moved[2]) / 0.64 };
      return { x: Number.parseFloat(ball.style.left), y: Number.parseFloat(ball.style.top) };
    };
    const read = (t: number) => {
      const ball = document.querySelector<HTMLElement>('[data-testid="broadcast-ball"]');
      const now = document.querySelector('[data-testid="instant-replay"]') !== null;
      if (now !== replaying) cut++;
      replaying = now;
      if (ball !== null && !replaying) {
        const { x, y } = spot(ball);
        if (Number.isFinite(x) && Number.isFinite(y)) w.samples.push({ t, x, y, cut });
      }
      requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
  if (process.env.THROTTLE) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.THROTTLE) });
  }
}

/** How many ball samples there are, and the ball's fastest speed per 60 Hz frame. */
async function ballSpeed(page: Page): Promise<{ count: number; perFrameMax: number }> {
  const samples = await page.evaluate(() => (window as unknown as { samples: Sample[] }).samples);
  // A render that misses a frame shows the clock from a moment earlier and the next one catches
  // up, so one frame-to-frame step is noisy on a slow CPU. Measure the speed over at least 100 ms
  // (six frames) instead; a teleport still shows as a step far above a carried ball's.
  const WINDOW = 100;
  let rawMax = 0;
  let perFrameMax = 0;
  for (let i = 1, j = 0; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (a.cut !== b.cut) {
      j = i;
      continue;
    }
    rawMax = Math.max(rawMax, Math.hypot(b.x - a.x, (b.y - a.y) * 0.64));
    while (j + 1 < i && b.t - samples[j + 1]!.t >= WINDOW) j++;
    const w = samples[j]!;
    const dt = b.t - w.t;
    if (dt < WINDOW) continue;
    const d = Math.hypot(b.x - w.x, (b.y - w.y) * 0.64);
    perFrameMax = Math.max(perFrameMax, (d * (1000 / 60)) / dt);
  }
  console.log(
    `ball samples: ${samples.length}, largest move between rendered frames: ${rawMax.toFixed(2)}%, fastest over ${WINDOW} ms, per 60 Hz frame: ${perFrameMax.toFixed(2)}%`,
  );
  return { count: samples.length, perFrameMax };
}

test("the ball never teleports through the first goal and its kickoff, at 390px (catches a 78% one-frame jump)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await sampleBall(page);
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();

  await expect(replay.getByTestId("move-callout")).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `${SHOT}/390-goal-from-live-ball.png` });
  await expect(replay.getByTestId("goal-flash")).toBeVisible({ timeout: 5_000 });
  await expect(replay.getByTestId("goal-flash")).toBeHidden({ timeout: 5_000 });
  await replay.getByTestId("replay-skip").click({ timeout: 5_000 });
  // The walk back to kickoff shape, then the conceding side on the ball at the centre spot.
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOT}/390-kickoff-after-goal.png` });
  await page.waitForTimeout(1_500);

  const { count, perFrameMax } = await ballSpeed(page);
  expect(count).toBeGreaterThan(300);
  // The 4% bound on the choreography itself is the unit test's, at an exact 60 Hz clock.
  expect(perFrameMax).toBeLessThan(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("at 2x the ball stays under 8% of the pitch per frame through the 59' save, at 390px (catches a parry thrown the length of the pitch)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await sampleBall(page);
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await replay.getByTestId("speed-toggle").click();
  await expect(replay.getByTestId("speed-toggle")).toHaveAttribute("aria-pressed", "true");

  const minute = async () =>
    Number(await replay.getByTestId("match-player").getAttribute("data-minute"));
  // The clock holds on 59 while the save stages, then the parry settles into play as it runs on.
  await expect.poll(minute, { timeout: 90_000, intervals: [50] }).toBeGreaterThanOrEqual(60);
  await page.screenshot({ path: `${BOUNDS_SHOT}/390-2x-after-save.png` });
  await expect.poll(minute, { timeout: 10_000, intervals: [50] }).toBeGreaterThanOrEqual(61);

  const { count, perFrameMax } = await ballSpeed(page);
  expect(count).toBeGreaterThan(300);
  // At 2x the clock and every staging run twice as fast, so the 4% bound per 1x frame is 8% per
  // real frame.
  expect(perFrameMax).toBeLessThan(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
