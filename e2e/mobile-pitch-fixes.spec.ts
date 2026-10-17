import { expect, test, type Page } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { draftSixteen } from "./helpers";

// Group match 1 of the golden cup8 run under engine 6. The user's slot 4 is booked at 3', so the
// card pip, the ball carrier's nameplate and a pass trail are all on the pitch early.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/mobile-pitch-fixes";

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Pairs of HUD pieces whose boxes overlap, as "a / b". */
function hudOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="match-hud"]');
    const pieces = [...(hud?.querySelectorAll(":scope > div > span") ?? [])].map((el) => ({
      text: el.textContent || "bar",
      r: el.getBoundingClientRect(),
    }));
    const hits: string[] = [];
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i]!.r;
        const b = pieces[j]!.r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > -2 && h > 0) hits.push(`${pieces[i]!.text} / ${pieces[j]!.text}`);
      }
    }
    return hits;
  });
}

/** The carrier nameplate's computed font size and its on-screen scale. */
function carrier(page: Page): Promise<{ font: string; scale: number; text: string } | null> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="ball-carrier"]');
    if (el === null) return null;
    return {
      font: getComputedStyle(el).fontSize,
      scale: Math.round((el.getBoundingClientRect().height / el.offsetHeight) * 100) / 100,
      text: el.textContent ?? "",
    };
  });
}

function rect(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el === null) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
    };
  }, selector);
}

for (const width of [390, 360, 320]) {
  test(`the live pitch reads at ${width}px: HUD, nameplate, card pip and trail`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/r/${LIVE}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
    await page.getByTestId("match-G1").getByTestId("watch-live").click();
    const replay = page.getByTestId("match-replay");
    await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-motion", "on");

    const overlaps = new Set<string>();
    let badge: Awaited<ReturnType<typeof carrier>> = null;
    let pip: Box | null = null;
    let ring: Box | null = null;
    for (let i = 0; i < 400 && (badge === null || pip === null || ring === null); i++) {
      for (const o of await hudOverlaps(page)) overlaps.add(o);
      badge ??= await carrier(page);
      pip ??= await rect(page, '[data-testid^="pitch-card-user-"]');
      ring ??= await rect(page, '[data-testid="broadcast"] circle[r="1.1"]');
      await page.waitForTimeout(50);
    }
    for (const o of await hudOverlaps(page)) overlaps.add(o);
    await replay.getByTestId("broadcast").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/${width}-live-pitch.png` });
    console.log(
      `${width}px: overlaps ${JSON.stringify([...overlaps])}, carrier ${JSON.stringify(badge)}, pip ${JSON.stringify(pip)}, trail origin ${JSON.stringify(ring)}`,
    );

    expect([...overlaps]).toEqual([]);
    expect(badge).not.toBeNull();
    expect(badge!.font).toBe("11px");
    expect(badge!.scale).toBe(1);
    expect(pip).not.toBeNull();
    expect([pip!.w, pip!.h]).toEqual([9, 13]);
    expect(ring).not.toBeNull();
    expect(Math.abs(ring!.w - ring!.h)).toBeLessThan(0.5);
  });
}

test("all 22 sprites are drawn at the kickoff stop on a slow network, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "live" }),
      );
  });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);

  // A phone network: every request waits 400 ms before its first byte.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("prematch")).toBeVisible();
  // The player reads the pre-match card before going on.
  await page.waitForTimeout(2_000);
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("stop-kickoff")).toBeVisible();

  const sprites = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="broadcast"] img')].map(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await page.getByTestId("broadcast").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390-kickoff-stop.png` });
  console.log(`sprites drawn at the kickoff stop: ${JSON.stringify(sprites)}`);
  expect(sprites.length).toBe(22);
  expect(sprites.filter(Boolean).length).toBe(22);
});
