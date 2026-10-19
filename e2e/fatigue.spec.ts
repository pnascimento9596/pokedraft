import { expect, test, type Locator, type Page } from "@playwright/test";
import { encodeToken } from "../src/engine/token";
import {
  GENS,
  RUN_TOKEN_VERSION,
  type DraftAction,
  type ManagerAction,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "../src/engine/types";

// A builder squad pinned for this proof: fifteen strong players and Magikarp (STA 19) in slot 2,
// pressing all match. On engine 6, in the R16 extra time Magikarp is at 42 energy from 115' and
// slot 10 at 64. The token is encoded for the live engine, so an engine bump replays this squad
// on the new engine instead of on a retained bundle.
const STARTERS = [784, 1009, 129, 289, 887, 373, 1010, 998, 1022, 1018, 1006];
const BENCH = [993, 706, 248, 1023, 989];
const place =
  (kind: "starter" | "bench") =>
  (species: number, index: number): DraftAction => ({
    type: "place",
    species: species as SpeciesId,
    slot: { kind, index } as SlotRef,
  });
const TOKEN = encodeToken({
  v: RUN_TOKEN_VERSION,
  settings: { mode: "builder", formation: "4-3-3", gens: GENS, legendaries: false },
  seed: "fatigue-1" as Seed,
  actions: [...STARTERS.map(place("starter")), ...BENCH.map(place("bench"))],
  manager: Array.from({ length: 6 }, (_, match): ManagerAction => ({
    type: "tactic",
    match,
    minute: 0,
    tactic: "press",
  })),
});
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
  await page.getByTestId("match-R16").getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  const pitch = replay.getByTestId("broadcast");
  await expect(pitch).toBeVisible();
  await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
  const player = replay.getByTestId("match-player");
  await toMinute(page, player, 116);

  const spent = pitch.locator('[data-side="user"][data-slot="2"]');
  await expect(spent).toHaveAttribute("data-tired", "true");
  await expect(spent.getByTestId("pitch-sweat-user-2")).toBeVisible();
  await expect(spent.getByTestId("pitch-stamina-user-2")).toBeVisible();
  const tired = pitch.locator('[data-side="user"][data-slot="10"]');
  await expect(tired.getByTestId("pitch-sweat-user-10")).toBeVisible();
  await expect(tired.getByTestId("pitch-stamina-user-10")).toHaveCount(0);
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
  const arc = await spent.getByTestId("pitch-stamina-user-2").boundingBox();
  expect(arc!.width).toBeGreaterThan(20);
  await page.screenshot({
    path: `${SHOT}/390-spent-close.png`,
    clip: { x: box!.x - 50, y: box!.y - 40, width: box!.width + 100, height: box!.height + 80 },
  });
});
