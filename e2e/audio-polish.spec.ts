import { expect, test } from "@playwright/test";
import { LIVE_GOLDEN_CUP8 } from "./pins";

const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/audio-polish";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pokedraft:sound", "true");
    const probe = { contexts: [] as AudioContext[], sources: 0, stops: 0 };
    (window as unknown as { __audio: typeof probe }).__audio = probe;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts.push(this);
      }
      createBufferSource() {
        probe.sources++;
        const node = super.createBufferSource();
        const stop = node.stop.bind(node);
        node.stop = (when?: number) => {
          probe.stops++;
          stop(when);
        };
        return node;
      }
    };
  });
});

function audio(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const p = (
      window as unknown as {
        __audio: { contexts: AudioContext[]; sources: number; stops: number };
      }
    ).__audio;
    return {
      contexts: p.contexts.length,
      state: p.contexts[0]?.state ?? null,
      beds: p.sources,
      stops: p.stops,
    };
  });
}

test("tapping Watch live resumes the AudioContext and starts the crowd bed at 390px", async ({
  page,
}) => {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  expect(await audio(page)).toEqual({ contexts: 0, state: null, beds: 0, stops: 0 });

  await page.getByTestId("match-G2").getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await expect.poll(async () => (await audio(page)).state).toBe("running");
  await expect.poll(async () => (await audio(page)).beds).toBe(1);
  await expect
    .poll(async () => Number(await replay.getByTestId("match-player").getAttribute("data-minute")))
    .toBeGreaterThan(2);
  await page.screenshot({ path: `${SHOT}/watch-live-390.png` });
  expect(await audio(page)).toMatchObject({ contexts: 1, state: "running", beds: 1, stops: 0 });

  await replay.getByTestId("sound-toggle").tap();
  await expect.poll(async () => (await audio(page)).stops).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("pausing Watch live stops the crowd bed and closing it starts no other", async ({ page }) => {
  await page.goto(`/r/${LIVE}`);
  await page.getByTestId("match-G2").getByTestId("watch-live").tap();
  const replay = page.getByTestId("match-replay");
  await expect.poll(async () => (await audio(page)).beds).toBe(1);
  await replay.getByTestId("play-toggle").tap();
  await expect.poll(async () => (await audio(page)).stops).toBe(1);
  await replay.getByTestId("match-replay-close").tap();
  await expect(replay).toHaveCount(0);
  expect((await audio(page)).beds).toBe(1);
});
