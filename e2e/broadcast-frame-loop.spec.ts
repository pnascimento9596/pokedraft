import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under the live engine-6 prefix, watched live at 1x.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/broadcast-frame-loop";

test.use({ hasTouch: true, isMobile: true });

for (const width of [390, 360, 320]) {
  test(`the live pitch moves by transform and keeps every player on the pitch, at ${width}px`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/r/${LIVE}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
    await page.getByTestId("match-G1").getByTestId("watch-live").click();
    const replay = page.getByTestId("match-replay");
    const broadcast = replay.getByTestId("broadcast");
    await expect(broadcast).toBeVisible();
    await expect(replay.getByTestId("match-player")).not.toHaveAttribute("data-minute", "0");

    const sample = () =>
      broadcast.evaluate((root) => {
        const pitch = root.firstElementChild!.getBoundingClientRect();
        const ball = root.querySelector<HTMLElement>('[data-testid="broadcast-ball"]')!;
        return {
          pitch: { left: pitch.left, right: pitch.right, top: pitch.top, bottom: pitch.bottom },
          ball: ball.getAttribute("style") ?? "",
          players: [...root.querySelectorAll<HTMLElement>("[data-slot]")].map((el) => {
            const r = el.getBoundingClientRect();
            return {
              style: el.getAttribute("style") ?? "",
              x: (r.left + r.right) / 2,
              y: (r.top + r.bottom) / 2,
            };
          }),
        };
      });

    const first = await sample();
    await page.waitForTimeout(250);
    const later = await sample();

    expect(first.players).toHaveLength(22);
    for (const p of later.players) {
      expect(p.style).toMatch(/^transform: translate3d\([\d.]+cqi, [\d.]+cqi, 0\)/);
      expect(p.x).toBeGreaterThanOrEqual(later.pitch.left);
      expect(p.x).toBeLessThanOrEqual(later.pitch.right);
      expect(p.y).toBeGreaterThanOrEqual(later.pitch.top);
      expect(p.y).toBeLessThanOrEqual(later.pitch.bottom);
    }
    expect(later.ball).not.toBe(first.ball);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await broadcast.screenshot({ path: `${SHOT}/${width}-live.png` });
  });
}
