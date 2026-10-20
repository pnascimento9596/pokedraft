import { expect, test } from "@playwright/test";
import { LIVE_GOLDEN_CUP8 } from "./pins";

const LIVE = LIVE_GOLDEN_CUP8;
const TYPED = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];
const SHOT = "docs/reports/one-shared-timeline";

// Fingerprints of playAbilitySound's typed families: oscillator type, start and end frequency,
// named after one type in each family.
const ABILITY_TONES: Record<string, string> = {
  "sawtooth:220:520": "fire",
  "sine:340:620": "water",
  "square:880:440": "electric",
  "triangle:480:760": "grass",
  "sine:1046.5:1318.5": "ice",
  "sine:660:390": "psychic",
  "sawtooth:130:55": "ground",
};

test("a live match plays typed move sounds and shows typed callouts at 390px", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((tones: Record<string, string>) => {
    const w = window as unknown as { heard: string[]; shown: string[] };
    w.heard = [];
    w.shown = [];
    const starts = new WeakMap<AudioParam, number>();
    const ends = new WeakMap<AudioParam, number>();
    const set = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function (v, t) {
      if (!starts.has(this)) starts.set(this, v);
      return set.call(this, v, t);
    };
    const ramp = AudioParam.prototype.exponentialRampToValueAtTime;
    AudioParam.prototype.exponentialRampToValueAtTime = function (v, t) {
      if (!ends.has(this)) ends.set(this, v);
      return ramp.call(this, v, t);
    };
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when) {
      const key = `${this.type}:${starts.get(this.frequency)}:${ends.get(this.frequency)}`;
      if (tones[key] !== undefined) w.heard.push(tones[key]);
      return start.call(this, when);
    };
    new MutationObserver(() => {
      for (const el of document.querySelectorAll(
        '[data-testid="pitch-ability"], [data-testid="move-callout"]',
      )) {
        const effect = el.getAttribute("data-effect");
        if (effect !== null && w.shown.at(-1) !== effect) w.shown.push(effect);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true });
  }, ABILITY_TONES);

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G2").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await replay.getByTestId("sound-toggle").click();
  await expect(replay.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "true");
  await replay.getByTestId("speed-toggle").click();

  const typed = replay.locator(
    TYPED.map((e) => `[data-testid="pitch-ability"][data-effect="${e}"]`).join(", "),
  );
  await expect(typed.first()).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: `${SHOT}/390-typed-callout.png` });

  await page.waitForTimeout(15_000);
  const { heard, shown } = await page.evaluate(() => {
    const w = window as unknown as { heard: string[]; shown: string[] };
    return { heard: [...w.heard], shown: [...w.shown] };
  });
  expect(heard.length).toBeGreaterThan(0);
  expect(shown.filter((e) => TYPED.includes(e)).length).toBeGreaterThan(0);
  console.log(`typed tones heard: ${heard.join(",")}`);
  console.log(`pitch effects shown: ${shown.join(",")}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
