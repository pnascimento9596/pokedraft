import { expect, test, type Page } from "@playwright/test";
import { LIVE_GOLDEN_CUP8, LIVE_GOLDEN_KANTO151, SET_PIECES } from "./pins";

// The golden runs under the live prefix, watched live. Each test stages the run's first user goal
// of one kind, as e2e/pins.ts finds it.
const CUP8 = LIVE_GOLDEN_CUP8;
const KANTO = LIVE_GOLDEN_KANTO151;
const SHOT = "docs/reports/set-pieces";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

interface Spot {
  readonly side: string;
  readonly slot: number;
  readonly pose: string;
  readonly x: number;
  readonly y: number;
}

interface Pitch {
  readonly clock: string;
  readonly trail: string | null;
  readonly ball: { readonly x: number; readonly y: number };
  readonly players: readonly Spot[];
}

// Where everything stands on the pitch, in percent of its width and height. A player's point sits
// 70% down their box and the ball's at its centre, as the stylesheet anchors them.
async function installReader(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { pitch: () => Pitch | null }).pitch = () => {
      const ball = document.querySelector<HTMLElement>('[data-testid="broadcast-ball"]');
      const box = ball?.parentElement?.getBoundingClientRect();
      if (ball == null || box == null) return null;
      const at = (el: Element, down: number) => {
        const r = el.getBoundingClientRect();
        return {
          x: ((r.left + r.width / 2 - box.left) / box.width) * 100,
          y: ((r.top + r.height * down - box.top) / box.height) * 100,
        };
      };
      const players = [...document.querySelectorAll<HTMLElement>("[data-slot][data-side]")].map(
        (el) => ({
          side: el.dataset.side ?? "",
          slot: Number(el.dataset.slot),
          pose: el.dataset.pose ?? "",
          ...at(el, 0.7),
        }),
      );
      return {
        clock: document.querySelector('[data-testid="matchday-clock"]')?.textContent ?? "",
        trail:
          document.querySelector<HTMLElement>('[data-testid="pitch-trails"]')?.dataset.kind ?? null,
        ball: at(ball, 0.5),
        players,
      };
    };
  });
}

async function watch(page: Page, token: string, round: string): Promise<void> {
  await installReader(page);
  await page.goto(`/r/${token}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${round}`).getByTestId("watch-live").click();
  await expect(page.getByTestId("match-replay").getByTestId("broadcast")).toBeVisible();
}

/**
 * Waits for the first painted frame that `when` returns, screenshots it and returns it. `when` runs
 * in the page, so it reads the pitch through `window.pitch` and its pin through `arg`, and nothing
 * else from this file.
 */
async function frameWhere<A>(
  page: Page,
  when: (arg: A) => Pitch | null,
  arg: A,
  file: string,
  timeout: number,
): Promise<Pitch> {
  // A pin is plain JSON, so Playwright hands it to the page unchanged; TypeScript cannot prove that
  // `Unboxed<A>` is `A` for a generic `A`.
  const inPage = when as (arg: unknown) => Pitch | null;
  const handle = await page.waitForFunction(inPage, arg, { polling: "raf", timeout });
  const frame = (await handle.jsonValue()) as Pitch;
  await page.screenshot({ path: `${SHOT}/${file}` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  return frame;
}

const { solo, header, penalty, freeKick } = SET_PIECES;

test(`solo: ${solo.scorer} dribbles past the defender who steps in, cup8 ${solo.round} ${solo.minute}'`, async ({
  page,
}) => {
  test.setTimeout(120_000);
  await watch(page, CUP8, solo.round);
  const frame = await frameWhere(
    page,
    (pin) => {
      const p = (window as unknown as { pitch: () => Pitch | null }).pitch();
      return p !== null &&
        p.clock === `${pin.minute}'` &&
        p.trail === "dribble" &&
        p.players.some((q) => q.side === "opp" && q.slot === pin.presser && q.pose === "press") &&
        p.players.some(
          (q) =>
            q.side === "user" &&
            q.slot === pin.slot &&
            Math.hypot(p.ball.x - q.x, (p.ball.y - q.y) * 0.64) < 4,
        )
        ? p
        : null;
    },
    solo,
    "390-solo.png",
    90_000,
  );
  const scorer = frame.players.find((q) => q.side === "user" && q.slot === solo.slot)!;
  console.log(
    `solo frame: ball ${JSON.stringify(frame.ball)}, ${solo.scorer} ${scorer.x}, ${scorer.y}`,
  );
  expect(Math.hypot(frame.ball.x - scorer.x, (frame.ball.y - scorer.y) * 0.64)).toBeLessThan(4);
});

test(`header: the cross from the wing, cup8 ${header.round} ${header.minute}'`, async ({
  page,
}) => {
  test.setTimeout(120_000);
  await watch(page, CUP8, header.round);
  const frame = await frameWhere(
    page,
    (pin) => {
      const p = (window as unknown as { pitch: () => Pitch | null }).pitch();
      return p !== null && p.clock === `${pin.minute}'` && p.trail === "cross" ? p : null;
    },
    header,
    "390-header-cross.png",
    90_000,
  );
  console.log(`header frame: ball ${JSON.stringify(frame.ball)}`);
  expect(frame.ball.x).toBeGreaterThan(84);
});

test(`penalty: the ball on the spot at 89 and ${penalty.taker} over it in the pause, cup8 ${penalty.round} ${penalty.minute}'`, async ({
  page,
}) => {
  test.setTimeout(180_000);
  await watch(page, CUP8, penalty.round);
  const frame = await frameWhere(
    page,
    (pin) => {
      const p = (window as unknown as { pitch: () => Pitch | null }).pitch();
      return p !== null &&
        p.clock === `${pin.minute}'` &&
        Math.abs(p.ball.x - 89) < 1 &&
        Math.abs(p.ball.y - 50) < 2 &&
        p.players.some(
          (q) => q.side === "user" && q.slot === pin.slot && Math.abs(q.x - 87.4) < 0.5,
        )
        ? p
        : null;
    },
    penalty,
    "390-penalty-pause.png",
    150_000,
  );
  const taker = frame.players.find((q) => q.side === "user" && q.slot === penalty.slot)!;
  console.log(
    `penalty frame: ball ${JSON.stringify(frame.ball)}, ${penalty.taker} ${taker.x}, ${taker.y}`,
  );
  expect(Math.abs(taker.y - 50)).toBeLessThan(2);
});

test(`free kick: three defenders in a wall between the spot at 75 and goal, kanto151 ${freeKick.round} ${freeKick.minute}'`, async ({
  page,
}) => {
  test.setTimeout(120_000);
  await watch(page, KANTO, freeKick.round);
  const frame = await frameWhere(
    page,
    (pin) => {
      const p = (window as unknown as { pitch: () => Pitch | null }).pitch();
      return p !== null &&
        p.clock === `${pin.minute}'` &&
        Math.abs(p.ball.x - 75) < 1 &&
        Math.abs(p.ball.y - 50) < 2 &&
        p.players.filter(
          (q) =>
            q.side === "opp" &&
            q.pose === "idle" &&
            Math.abs(q.x - 84) < 1.5 &&
            Math.abs(q.y - 50) <= 5,
        ).length === 3
        ? p
        : null;
    },
    freeKick,
    "390-free-kick-wall.png",
    90_000,
  );
  const wall = frame.players
    .filter((q) => q.side === "opp" && Math.abs(q.x - 84) < 1.5 && Math.abs(q.y - 50) <= 5)
    .map((q) => ({ slot: q.slot, y: Math.round(q.y) }))
    .sort((a, b) => a.y - b.y);
  console.log(`free kick wall: ${JSON.stringify(wall)}`);
  expect(wall).toEqual(freeKick.wall);
});
