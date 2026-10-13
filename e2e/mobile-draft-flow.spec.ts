import { expect, test, chromium, webkit, type Page } from "@playwright/test";

const formations = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "3-5-2", "3-4-3", "3-4-2-1", "5-3-2"];

async function wheelVisible(page: Page) {
  await expect
    .poll(() =>
      page.getByTestId("draft-wheel").evaluate((element) => {
        const r = element.getBoundingClientRect();
        return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
      }),
    )
    .toBe(true);
}

for (const engine of ["chromium", "webkit"] as const) {
  for (const width of [375, 390]) {
    test(`${engine} ${width}px brings each real roll into view without forcing candidate scroll`, async ({
      baseURL,
    }) => {
      const browser = await { chromium, webkit }[engine].launch();
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const original = Element.prototype.scrollIntoView;
        Object.defineProperty(window, "draftScrolls", { value: [], writable: true });
        Element.prototype.scrollIntoView = function (options) {
          if (this.getAttribute("data-testid") === "draft-wheel") {
            (window as unknown as { draftScrolls: unknown[] }).draftScrolls.push(options);
          }
          original.call(this, options);
        };
      });
      await page.goto(
        "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=mobile-flow",
      );
      await expect(page.getByTestId("run-start")).toBeVisible();
      await expect(page.getByTestId("draft-wheel")).toHaveCount(0);
      await page.getByTestId("run-start").tap();
      await wheelVisible(page);
      const scrolls = () =>
        page.evaluate(() => (window as unknown as { draftScrolls: unknown[] }).draftScrolls.length);
      expect(await scrolls()).toBe(1);
      await page.locator('[data-testid^="candidate-"]').first().tap();
      await page.getByTestId("slot-s9").scrollIntoViewIfNeeded();
      const y = await page.evaluate(() => scrollY);
      await page.waitForTimeout(250);
      expect(await page.evaluate(() => scrollY)).toBe(y);
      expect(await scrolls()).toBe(1);
      const frame = await page.getByTestId("slot-s9").evaluate((element) => {
        const s = getComputedStyle(element);
        return { border: s.borderStyle, outline: s.outlineStyle };
      });
      expect(frame).toEqual({ border: "solid", outline: "none" });
      await page.getByTestId("slot-s9").tap();
      await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
      await wheelVisible(page);
      expect(await scrolls()).toBe(2);
      await page.locator('[data-testid^="candidate-"]').first().tap();
      await page.getByTestId("slot-s0").tap();
      await wheelVisible(page);
      expect(await scrolls()).toBe(3);
      await page.getByRole("button", { name: /^Reroll type/ }).tap();
      await wheelVisible(page);
      expect(await scrolls()).toBe(4);
      await page.getByRole("button", { name: "Minimize draft picker" }).tap();
      await page.getByRole("button", { name: "Choose a player", exact: true }).tap();
      await page.evaluate(() => window.scrollBy(0, -150));
      await page.waitForTimeout(250);
      expect(await scrolls()).toBe(4);
      for (let round = 3; round <= 16; round++) {
        await page.locator('[data-testid^="candidate-"]').first().tap();
        await page.locator('[data-testid^="slot-"][data-filled="false"]').first().tap();
        if (round < 16) await wheelVisible(page);
      }
      await expect(page.getByTestId("round-header")).toHaveText("Draft complete");
      expect(await scrolls()).toBe(17);
      await expect(page.getByTestId("draft-wheel")).toHaveCount(0);
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-complete.png`,
        fullPage: true,
      });
      await page.goto("/play?mode=kanto151&f=4-3-3&order=positionFirst&seed=mobile-position");
      await page.getByTestId("run-start").tap();
      await expect(page.getByTestId("draft-wheel")).toHaveCount(0);
      await page.getByTestId("slot-s9").tap();
      await wheelVisible(page);
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-wheel.png`,
        fullPage: true,
      });
      await context.close();
      await browser.close();
    });

    test(`${engine} ${width}px compact draft retains eleven separate 44px targets in all eight formations`, async ({
      baseURL,
    }) => {
      const browser = await { chromium, webkit }[engine].launch();
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      for (const formation of formations) {
        await page.goto(
          `/play?mode=kanto151&f=${formation}&order=squadFirst&seed=compact-${formation}`,
        );
        await page.getByTestId("run-start").tap();
        const field = page.getByTestId("pitch-stage");
        expect(await field.evaluate((e) => getComputedStyle(e).height)).toBe("620px");
        const boxes = await page.locator('[data-testid^="slot-s"]').evaluateAll((elements) =>
          elements.map((e) => {
            const r = e.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              font: parseFloat(getComputedStyle(e.querySelector('[id$="-slot"]') ?? e).fontSize),
            };
          }),
        );
        expect(boxes).toHaveLength(11);
        for (const [i, a] of boxes.entries()) {
          expect(a.width).toBeGreaterThanOrEqual(44);
          expect(a.height).toBeGreaterThanOrEqual(44);
          expect(a.font).toBeGreaterThanOrEqual(11);
          expect(a.x).toBeGreaterThanOrEqual(0);
          expect(a.x + a.width).toBeLessThanOrEqual(width);
          for (const b of boxes.slice(i + 1)) {
            expect(
              Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
                Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5,
              `${formation} overlapping targets`,
            ).toBe(false);
          }
        }
        for (const slot of await page.locator('[data-testid^="slot-s"]').all()) {
          await slot.scrollIntoViewIfNeeded();
          expect(
            await slot.evaluate((e) => {
              const r = e.getBoundingClientRect();
              return (
                document
                  .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                  ?.closest("[data-slot-key]") === e
              );
            }),
          ).toBe(true);
        }
      }
      await context.close();
      await browser.close();
    });
  }
}
