import { expect, test, type Page } from "@playwright/test";
import { LIVE_GOLDEN_CUP8 } from "./pins";

// Group match 1 of the golden cup8 run under the live prefix, watched live at 1x.
const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/follow-camera";

test.use({ hasTouch: true, isMobile: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

/** The camera on the pitch, and how far the shown pitch reaches past the view on each side. */
function sampleCamera(page: Page) {
  return page.getByTestId("broadcast").evaluate((root) => {
    const view = root.querySelector('[data-testid="pitch-view"]')!.getBoundingClientRect();
    const pitch = root.querySelector('[data-testid="pitch"]')!;
    const p = pitch.getBoundingClientRect();
    return {
      camera: root.getAttribute("data-camera"),
      transform: pitch.getAttribute("style") ?? "",
      margin: Math.min(
        view.left - p.left,
        p.right - view.right,
        view.top - p.top,
        p.bottom - view.bottom,
      ),
    };
  });
}

test("Follow is the default at 390: the camera zooms 1.6 on the ball and never shows outside the pitch (catches a phone on the full pitch, or a camera past the touchline)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  const replay = await watchLive(page);
  await expect(replay.getByTestId("match-player")).not.toHaveAttribute("data-minute", "0");
  const follow = replay.getByRole("button", { name: "Follow" });
  const full = replay.getByRole("button", { name: "Full pitch" });
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  for (const button of [follow, full]) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  let closest = Infinity;
  const zooms = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const s = await sampleCamera(page);
    expect(s.camera).toBe("follow");
    expect(s.transform).toMatch(/^transform: translate\(-?[\d.]+%, -?[\d.]+%\) scale\([\d.]+\)$/);
    zooms.add(/scale\(([\d.]+)\)/.exec(s.transform)![1]!);
    closest = Math.min(closest, s.margin);
    await page.waitForTimeout(100);
  }
  console.log(`390 follow: zooms ${[...zooms].join(", ")}, closest margin ${closest}px`);
  expect(zooms.has("1.600")).toBe(true);
  expect(closest).toBeGreaterThanOrEqual(-0.5);
  await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390-follow.png` });

  await full.click();
  await expect(full).toHaveAttribute("aria-pressed", "true");
  await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-camera", "full");
  expect((await sampleCamera(page)).transform).toBe("");
  await page.screenshot({ path: `${SHOT}/390-full.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Full is the default at 1280 (catches a desktop that opens zoomed in)", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 1280, height: 900 });
  const replay = await watchLive(page);
  await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-camera", "full");
  await expect(replay.getByRole("button", { name: "Full pitch" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await sampleCamera(page)).transform).toBe("");
});

test("with reduced motion a phone opens on the full pitch at 390", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const replay = await watchLive(page);
  await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-camera", "full");
});

test("the first goal of the match shows the full pitch at 1.0 in Follow at 390 (catches a goal staged zoomed in)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  const replay = await watchLive(page);
  await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
  const player = replay.getByTestId("match-player");
  const flash = replay.getByTestId("goal-flash");
  for (let i = 0; i < 3_000 && (await flash.count()) === 0; i++) {
    if ((await player.getAttribute("data-minute")) === "90") break;
    await page.clock.runFor(50);
  }
  await expect(flash).toBeVisible();
  const s = await sampleCamera(page);
  expect(s.camera).toBe("follow");
  expect(s.transform).toBe("transform: translate(0.00%, 0.00%) scale(1.000)");
  await page.screenshot({ path: `${SHOT}/390-follow-goal.png` });
});
