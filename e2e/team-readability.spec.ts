import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// Group match 1 of the golden cup8 run under engine 6. The user's starting eleven carries poison
// and grass four times each, and poison comes first in slot order (Toxtricity in slot 0), so the
// user wears poison. The opponent, Goldenrod United, is a water theme.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/team-readability";
const POISON = "rgb(163, 62, 161)";
const WATER = "rgb(99, 144, 240)";

test.use({ hasTouch: true, isMobile: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G1").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

/**
 * Each sprite's drawn width and the colour of the ring at its feet, by side. The width is the
 * scaled frame the 80px art fills; the art inside it turns and squashes with each pose.
 */
function sprites(page: Page) {
  return page.getByTestId("broadcast").evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>("[data-slot]")].map((el) => {
      const body = el.firstElementChild!;
      const art = body.querySelector("img");
      return {
        side: el.dataset.side ?? "",
        width:
          art === null || !art.complete
            ? null
            : Math.round(body.getBoundingClientRect().width * 100) / 100,
        ring: getComputedStyle(body, "::before").boxShadow,
      };
    }),
  );
}

for (const width of [390, 360, 320]) {
  test(`every sprite is at least 44px wide and wears its side's kit ring at ${width}px (catches 38px sprites and one fixed colour per side)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    await page.setViewportSize({ width, height: 844 });
    const replay = await watchLive(page);
    await expect(replay.getByTestId("match-player")).not.toHaveAttribute("data-minute", "0");
    await expect
      .poll(async () => (await sprites(page)).filter((p) => p.width !== null).length)
      .toBe(22);
    const seen = await sprites(page);
    const narrowest = Math.min(...seen.map((p) => p.width!));
    console.log(
      `${width}px: narrowest sprite ${narrowest}px, rings ${seen[0]!.ring} | ${seen[11]!.ring}`,
    );
    await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-kits.png` });

    expect(narrowest).toBeGreaterThanOrEqual(44);
    expect(seen.filter((p) => p.side === "user").every((p) => p.ring.includes(POISON))).toBe(true);
    expect(seen.filter((p) => p.side === "opp").every((p) => p.ring.includes(WATER))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("the kit rings still show with reduced motion at 390px (catches identity tied to motion)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await watchLive(page);
  const seen = await sprites(page);
  expect(seen).toHaveLength(22);
  expect(seen.filter((p) => p.side === "user").every((p) => p.ring.includes(POISON))).toBe(true);
  expect(seen.filter((p) => p.side === "opp").every((p) => p.ring.includes(WATER))).toBe(true);
});

for (const width of [390, 360, 320]) {
  test(`every play badge of a whole match stays inside the pitch box at ${width}px (catches badges clipped at the touchline)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
    const replay = await watchLive(page);
    await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
    const player = replay.getByTestId("match-player");
    const broadcast = replay.getByTestId("broadcast");

    // A badge's margin is its closest distance to a pitch edge; below zero it is clipped.
    const badges = new Map<string, number>();
    let edge = false;
    for (let i = 0; i < 3_000 && (await player.getAttribute("data-minute")) !== "90"; i++) {
      await page.clock.runFor(50);
      const seen = await broadcast.evaluate((root) => {
        const badge = root.querySelector('[data-testid="pitch-ability"]');
        if (badge === null) return null;
        const pitch = root.firstElementChild!.getBoundingClientRect();
        const r = badge.getBoundingClientRect();
        return {
          text: badge.textContent ?? "",
          margin: Math.min(
            r.left - pitch.left,
            pitch.right - r.right,
            r.top - pitch.top,
            pitch.bottom - r.bottom,
          ),
        };
      });
      if (seen === null) continue;
      badges.set(seen.text, Math.min(badges.get(seen.text) ?? Infinity, seen.margin));
      if (!edge && seen.margin < 2) {
        edge = true;
        await broadcast.screenshot({ path: `${SHOT}/${width}-edge-badge.png` });
      }
    }
    const clipped = [...badges.entries()]
      .filter(([, margin]) => margin < -0.5)
      .map(([text, margin]) => `${text} by ${Math.round(-margin * 10) / 10}px`);
    const closest = Math.min(...badges.values());
    console.log(
      `${width}px: ${badges.size} badges, closest margin ${Math.round(closest * 10) / 10}px, clipped ${JSON.stringify(clipped)}`,
    );
    expect(badges.size).toBeGreaterThan(5);
    expect(clipped).toEqual([]);
  });
}
