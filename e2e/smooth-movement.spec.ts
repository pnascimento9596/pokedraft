import { expect, test, type Locator, type Page } from "@playwright/test";
import { LIVE_GOLDEN_CUP8, RED_CARD } from "./pins";

// The golden cup8 run under the live prefix. G1 has a crowded moment at 38' (a probe minute picked
// by hand), and e2e/pins.ts holds the run's first user red card.
const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/smooth-movement";
const FRAME = 16;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

interface Spot {
  readonly side: string;
  readonly slot: string;
  readonly x: number;
  readonly y: number;
}

async function watch(page: Page, round: string): Promise<Locator> {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${round}`).getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
  return replay;
}

async function toMinute(page: Page, player: Locator, minute: number): Promise<void> {
  for (let i = 0; i < 200 && Number(await player.getAttribute("data-minute")) < minute - 1; i++) {
    await page.clock.runFor(400);
  }
  for (let i = 0; i < 400 && Number(await player.getAttribute("data-minute")) < minute; i++) {
    await page.clock.runFor(FRAME);
  }
  await expect(player).toHaveAttribute("data-minute", String(minute));
}

function spots(pitch: Locator, selector: string): Promise<Spot[]> {
  return pitch.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const e = el as HTMLElement;
      // The frame loop writes the spot as a transform in units of the pitch width, where the
      // pitch is 64 units tall.
      const moved = /translate3d\(([-\d.]+)cqi, ([-\d.]+)cqi/.exec(e.style.transform);
      return {
        side: e.dataset.side ?? "",
        slot: e.dataset.slot ?? "",
        x: moved === null ? Number.NaN : Number(moved[1]),
        y: moved === null ? Number.NaN : Number(moved[2]) / 0.64,
      };
    }),
  );
}

test("a red-carded player walks to the touchline and then leaves, at 390px (catches the player vanishing on the frame of the card)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  const replay = await watch(page, RED_CARD.round);
  const player = replay.getByTestId("match-player");
  const pitch = replay.getByTestId("broadcast");
  await toMinute(page, player, RED_CARD.minute);
  const leaving = pitch.locator("[data-leaving]");
  for (let i = 0; i < 200 && (await leaving.count()) === 0; i++) await page.clock.runFor(FRAME);
  await expect(leaving).toHaveCount(1);
  await expect(leaving).toHaveAttribute("data-side", "user");
  await expect(leaving).toHaveAttribute("data-slot", String(RED_CARD.slot));

  const path: number[] = [];
  const across: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [spot] = await spots(pitch, "[data-leaving]");
    path.push(spot!.y);
    across.push(spot!.x);
    if (i === 2) await page.screenshot({ path: `${SHOT}/390-red-card-walk-off.png` });
    await page.clock.runFor(400);
  }
  console.log(`walk-off y every 400 ms: ${path.map((y) => y.toFixed(2)).join(", ")}`);
  // Toward the near touchline (top of the pitch, y 0), every sample nearer than the last.
  for (let i = 1; i < path.length; i++) expect(path[i]!).toBeLessThan(path[i - 1]!);
  // Straight off from where the card found them, not drifting with the play they left.
  for (const x of across) expect(x).toBeCloseTo(across[0]!, 2);
  // The walk takes 1,800 ms at 1x; 1,600 ms have passed since the first sample.
  await page.clock.runFor(400);
  await expect(leaving).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("teammates who would stand on one spot are pushed at least 4% apart, at 390px (catches sprites stacked together)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(150_000);
  const replay = await watch(page, "G1");
  const player = replay.getByTestId("match-player");
  const pitch = replay.getByTestId("broadcast");
  await toMinute(page, player, 38);
  // About a tenth of a minute in at the live pace, inside the crowded moment the unit test pins.
  await page.clock.runFor(FRAME * 3);
  await expect(player).toHaveAttribute("data-minute", "38");

  const players = await spots(pitch, "[data-side][data-slot]:not([data-leaving])");
  expect(players.length).toBe(22);
  let nearest = Infinity;
  let pair = "";
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i]!;
      const b = players[j]!;
      if (a.side !== b.side) continue;
      const d = Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
      if (d < nearest) {
        nearest = d;
        pair = `${a.side} ${a.slot}-${b.slot}`;
      }
    }
  }
  console.log(`nearest same-side pair at 38': ${pair} ${nearest.toFixed(2)}%`);
  await page.screenshot({ path: `${SHOT}/390-cluster-pushed-apart.png` });
  expect(nearest).toBeGreaterThanOrEqual(3.99);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
