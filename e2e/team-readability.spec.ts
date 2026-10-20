import { expect, test, type Page } from "@playwright/test";
import { LIVE_GOLDEN_CUP8, TEAM_READABILITY } from "./pins";

// A group match of the golden cup8 run under the live prefix. Each side wears the kit ring
// e2e/pins.ts computes from its starters and theme.
const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/team-readability";
const USER_KIT = TEAM_READABILITY.user;
const OPP_KIT = TEAM_READABILITY.opp;

test.use({ hasTouch: true, isMobile: true });

async function watchLive(page: Page) {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${TEAM_READABILITY.round}`).getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  return replay;
}

/**
 * Each sprite's drawn width and the colour of the ring at its feet, by side. The width is the
 * scaled frame the 80px art fills; the art inside it turns and squashes with each pose. A player
 * in the play (`hot`) wears a white ring with a glow in the kit instead.
 */
function sprites(page: Page) {
  return page.getByTestId("broadcast").evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>("[data-slot]")].map((el) => {
      const body = el.firstElementChild!;
      const art = body.querySelector("img");
      return {
        side: el.dataset.side ?? "",
        hot: el.dataset.hot !== undefined,
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
    const rings = (side: string) => seen.filter((p) => p.side === side && !p.hot);
    expect(rings("user").length).toBeGreaterThanOrEqual(9);
    expect(rings("opp").length).toBeGreaterThanOrEqual(9);
    expect(rings("user").every((p) => p.ring.includes(USER_KIT))).toBe(true);
    expect(rings("opp").every((p) => p.ring.includes(OPP_KIT))).toBe(true);
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
  expect(seen.filter((p) => p.side === "user").every((p) => p.ring.includes(USER_KIT))).toBe(true);
  expect(seen.filter((p) => p.side === "opp").every((p) => p.ring.includes(OPP_KIT))).toBe(true);
});

for (const width of [390, 360, 320]) {
  test(`every play badge of a whole match stays inside the pitch box at ${width}px (catches badges clipped at the touchline)`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    // Up to 3,000 clock steps; hosted runners took 3.1 to 3.3 minutes here before Wave 5 5e.
    test.setTimeout(480_000);
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
    const replay = await watchLive(page);
    await page.clock.pauseAt(new Date("2026-10-18T12:00:10Z"));
    const player = replay.getByTestId("match-player");
    const broadcast = replay.getByTestId("broadcast");

    // A badge's margin is its closest distance to a pitch edge; below zero it is clipped.
    const badges = new Map<string, number>();
    let closest = Infinity;
    // One round trip per step reads the minute and the badge together.
    let minute = await player.getAttribute("data-minute");
    for (let i = 0; i < 3_000 && minute !== "90"; i++) {
      await page.clock.runFor(50);
      const step = await broadcast.evaluate((root) => {
        const minute =
          root.closest('[data-testid="match-player"]')?.getAttribute("data-minute") ?? null;
        const badge = root.querySelector('[data-testid="pitch-ability"]');
        if (badge === null) return { minute, seen: null };
        const pitch = root.firstElementChild!.getBoundingClientRect();
        const r = badge.getBoundingClientRect();
        return {
          minute,
          seen: {
            text: badge.textContent ?? "",
            margin: Math.min(
              r.left - pitch.left,
              pitch.right - r.right,
              r.top - pitch.top,
              pitch.bottom - r.bottom,
            ),
          },
        };
      });
      minute = step.minute;
      const seen = step.seen;
      if (seen === null) continue;
      badges.set(seen.text, Math.min(badges.get(seen.text) ?? Infinity, seen.margin));
      if (seen.margin < closest) {
        closest = seen.margin;
        await broadcast.screenshot({ path: `${SHOT}/${width}-edge-badge.png` });
      }
    }
    const clipped = [...badges.entries()]
      .filter(([, margin]) => margin < -0.5)
      .map(([text, margin]) => `${text} by ${Math.round(-margin * 10) / 10}px`);
    console.log(
      `${width}px: ${badges.size} badges, closest margin ${Math.round(closest * 10) / 10}px, clipped ${JSON.stringify(clipped)}`,
    );
    expect(minute).toBe("90");
    expect(badges.size).toBeGreaterThan(5);
    expect(clipped).toEqual([]);
  });
}
