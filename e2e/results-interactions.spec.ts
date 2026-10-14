import { expect, test, chromium, webkit, type Page } from "@playwright/test";
import fixture from "../scripts/audit/fixtures.json";

async function animationStates(page: Page) {
  return page.getByTestId("match-highlights").evaluate((el) =>
    el.getAnimations({ subtree: true }).map((a) => ({
      name:
        a instanceof CSSAnimation
          ? a.animationName
          : a instanceof CSSTransition
            ? `transition:${a.transitionProperty}`
            : "web-animation",
      state: a.playState,
      pending: a.pending,
    })),
  );
}

for (const engine of ["chromium", "webkit"] as const) {
  test.describe(engine, () => {
    test("strike runs the ball shot rather than continuing the dribble", async ({
      baseURL,
    }, testInfo) => {
      const browser = await (engine === "webkit" ? webkit : chromium).launch();
      const page = await browser.newPage({ baseURL, reducedMotion: "no-preference" });
      try {
        await page.goto(`/r/${fixture.shareRun.token}`);
        const ball = page.getByTestId("soccer-ball");
        await expect(ball).toBeVisible();
        await expect
          .poll(() => ball.evaluate((el) => getComputedStyle(el).animationName))
          .toContain("dribbleCrossover");
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 1000));
        await page.getByTestId("strike-btn").click();
        await expect
          .poll(() => ball.evaluate((el) => getComputedStyle(el).animationName))
          .toContain("ballStrikeShot");
        await page.waitForTimeout(180);
        const shot = await ball.evaluate((el) => ({
          name: getComputedStyle(el).animationName,
          transform: getComputedStyle(el).transform,
          opacity: getComputedStyle(el).opacity,
        }));
        expect(shot.transform).not.toBe("none");
        expect(shot.name).toContain("ballStrikeShot");
        await testInfo.attach(`${engine}-shot`, {
          body: JSON.stringify(shot),
          contentType: "application/json",
        });
        await page
          .getByTestId("match-highlights")
          .screenshot({ path: testInfo.outputPath(`${engine}-shot.png`) });
        await page.clock.runFor(600);
        await expect(page.getByTestId("goal-overlay")).toBeVisible();
      } finally {
        await browser.close();
      }
    });

    test("Pause Motion freezes every animation including strikes and goal pop but not timers", async ({
      baseURL,
    }, testInfo) => {
      const browser = await (engine === "webkit" ? webkit : chromium).launch();
      const page = await browser.newPage({ baseURL, reducedMotion: "no-preference" });
      try {
        await page.goto(`/r/${fixture.shareRun.token}`);
        await page.getByRole("button", { name: "Pause Motion" }).click();
        await expect(page.getByTestId("match-highlights")).toHaveAttribute("data-paused", "true");
        await expect
          .poll(async () =>
            (await animationStates(page)).every((a) => a.state === "paused" && !a.pending),
          )
          .toBe(true);
        const ball = page.getByTestId("soccer-ball");
        const before = await ball.evaluate((el) => getComputedStyle(el).transform);
        await page.waitForTimeout(200);
        expect(await ball.evaluate((el) => getComputedStyle(el).transform)).toBe(before);
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 1000));
        await page.getByTestId("strike-btn").click();
        await page.clock.runFor(600);
        await expect(page.getByTestId("goal-overlay")).toBeAttached();
        await expect
          .poll(async () => (await animationStates(page)).every((a) => a.state === "paused"))
          .toBe(true);
        const states = await animationStates(page);
        expect(states.some((a) => a.name.includes("ballStrikeShot"))).toBe(true);
        expect(states.some((a) => a.name.includes("goalPop"))).toBe(true);
        expect(states.every((a) => a.state === "paused"), JSON.stringify(states)).toBe(true);
        await testInfo.attach(`${engine}-paused`, {
          body: JSON.stringify(states),
          contentType: "application/json",
        });
        await page.getByRole("button", { name: "Play Motion" }).click();
        await expect
          .poll(async () => (await animationStates(page)).some((a) => a.state === "running"))
          .toBe(true);
        await page.clock.runFor(2300);
        await expect(page.getByTestId("goal-overlay")).toHaveCount(0);
        await expect(page.getByTestId("strike-btn")).toBeEnabled();
      } finally {
        await browser.close();
      }
    });

    test("reduced motion preserves controls without autoplay media", async ({ baseURL }) => {
      const browser = await (engine === "webkit" ? webkit : chromium).launch();
      const page = await browser.newPage({ baseURL, reducedMotion: "reduce" });
      try {
        await page.goto(`/r/${fixture.shareRun.token}`);
        await expect(page.getByTestId("soccer-ball")).toBeVisible();
        expect(await animationStates(page)).toEqual([]);
        await expect(page.locator("audio[autoplay], video[autoplay]")).toHaveCount(0);
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 1000));
        await page.getByTestId("strike-btn").click();
        await page.clock.runFor(600);
        await expect(page.getByTestId("goal-overlay")).toBeAttached();
        expect(
          await page
            .getByTestId("soccer-ball")
            .evaluate((el) => getComputedStyle(el).animationName),
        ).toBe("none");
        await page.getByRole("button", { name: "Continue Dribbling" }).click();
        await expect(page.getByTestId("strike-btn")).toBeEnabled();
      } finally {
        await browser.close();
      }
    });
  });
}
