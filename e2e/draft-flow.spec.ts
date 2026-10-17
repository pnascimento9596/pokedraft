import { expect, test, chromium, webkit, type Page } from "@playwright/test";
import { ready } from "./mobile/scenes";

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
        localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
        localStorage.setItem("pokedraft:images", JSON.stringify({ pack: "pokeapi-art" }));
        const original = Element.prototype.scrollIntoView;
        Object.defineProperty(window, "draftScrolls", { value: [], writable: true });
        Element.prototype.scrollIntoView = function (options) {
          if (this.getAttribute("data-testid") === "draft-pitch") {
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
      await ready(page, page.getByTestId("run-start"));
      await expect(page.getByTestId("run-start")).not.toHaveAttribute("aria-busy", "true");
      await page.getByTestId("run-start").tap();
      await wheelVisible(page);
      const scrolls = () =>
        page.evaluate(() => (window as unknown as { draftScrolls: unknown[] }).draftScrolls.length);
      expect(await scrolls()).toBe(1);
      await expect(page.locator('[data-testid^="candidate-"]')).toHaveCount(3);
      const picker = page.getByTestId("draft-drawer");
      for (const element of [picker, picker.locator("ul")]) {
        expect(
          await element.evaluate(
            (e) => e.scrollHeight <= e.clientHeight && e.scrollWidth <= e.clientWidth,
          ),
        ).toBe(true);
      }
      const cards = page.locator('[data-testid^="candidate-"]');
      await expect(cards.first().locator("img")).toHaveAttribute("src", /pokeapi-art/);
      await expect(cards.first().locator('[data-testid^="fit-"]')).toBeVisible();
      const lowest = await cards.evaluateAll((elements) =>
        Math.max(...elements.map((e) => e.getBoundingClientRect().bottom)),
      );
      const rerollTop = await page
        .getByRole("button", { name: /^Reroll type/ })
        .evaluate((e) => e.getBoundingClientRect().top);
      expect(rerollTop).toBeGreaterThanOrEqual(lowest);
      await picker.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-picker-art-ratings.png`,
      });
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
      await page.getByTestId("slot-s9").tap();
      await page.getByTestId("slot-s0").tap();
      await page.waitForTimeout(250);
      expect(await scrolls()).toBe(17);
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-complete.png`,
        fullPage: true,
      });
      await page.goto("/play?mode=kanto151&f=4-3-3&order=positionFirst&seed=mobile-position");
      await ready(page, page.getByTestId("run-start"));
      await expect(page.getByTestId("run-start")).not.toHaveAttribute("aria-busy", "true");
      await page.getByTestId("run-start").tap();
      await expect(page.getByTestId("draft-wheel")).toHaveCount(0);
      await page.getByTestId("slot-s9").tap();
      await wheelVisible(page);
      const committedFrame = await page.getByTestId("slot-s9").evaluate((element) => {
        const s = getComputedStyle(element);
        return { border: s.borderStyle, outline: s.outlineStyle };
      });
      const uncommittedFrame = await page.getByTestId("slot-s0").evaluate((element) => {
        const s = getComputedStyle(element);
        return { border: s.borderStyle, outline: s.outlineStyle };
      });
      expect(committedFrame).toEqual({ border: "solid", outline: "solid" });
      expect(uncommittedFrame).toEqual({ border: "solid", outline: "none" });
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-wheel.png`,
        fullPage: true,
      });
      await context.close();
      await browser.close();
    });

    test(`${engine} ${width}px open art picker uses document scrolling and preserves all five seeded offers`, async ({
      baseURL,
    }) => {
      const browser = await { chromium, webkit }[engine].launch();
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        hasTouch: true,
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
        localStorage.setItem("pokedraft:images", JSON.stringify({ pack: "pokeapi-art" }));
      });
      await page.goto(
        "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test",
      );
      await ready(page, page.getByTestId("run-start"));
      await expect(page.getByTestId("run-start")).not.toHaveAttribute("aria-busy", "true");
      await page.getByTestId("run-start").tap();
      await wheelVisible(page);
      await page.getByTestId("draft-wheel").evaluate((el) => {
        const skip = Array.from(el.querySelectorAll("button")).find(
          (button) => button.textContent === "Tap to skip",
        );
        skip?.click();
      });
      const picker = page.getByTestId("draft-drawer");
      await expect(page.locator('[data-testid^="candidate-"]')).toHaveCount(5);
      expect(
        await page
          .locator('[data-testid^="candidate-"]')
          .evaluateAll((elements) => elements.map((e) => e.getAttribute("data-testid"))),
      ).toEqual([
        "candidate-269",
        "candidate-315",
        "candidate-316",
        "candidate-317",
        "candidate-336",
      ]);
      await expect(page.getByTestId("fit-269")).toHaveText("Best: FB 51 vs other FBs");
      await expect(page.getByTestId("candidate-269").locator(".type-chip")).toHaveText([
        "Bug",
        "Poison",
      ]);
      for (const element of [picker, picker.locator("ul")]) {
        expect(
          await element.evaluate(
            (e) => e.scrollHeight <= e.clientHeight && e.scrollWidth <= e.clientWidth,
          ),
        ).toBe(true);
      }
      expect(await picker.evaluate((e) => getComputedStyle(e).position)).toBe("fixed");
      const lowestCardBottom = await page
        .locator('[data-testid^="candidate-"]')
        .evaluateAll((elements) =>
          Math.max(...elements.map((e) => e.getBoundingClientRect().bottom)),
        );
      expect(
        await page
          .getByRole("button", { name: /^Reroll type/ })
          .evaluate((e) => e.getBoundingClientRect().top),
      ).toBeGreaterThanOrEqual(lowestCardBottom);
      for (const card of await page.locator('[data-testid^="candidate-"]').all()) {
        const r = await card.boundingBox();
        expect(r!.width).toBeGreaterThanOrEqual(44);
        expect(r!.height).toBeGreaterThanOrEqual(44);
        expect(
          await card
            .locator("span")
            .evaluateAll((elements) =>
              elements.every((e) => parseFloat(getComputedStyle(e).fontSize) >= 11),
            ),
        ).toBe(true);
      }
      await page.getByTestId("candidate-336").scrollIntoViewIfNeeded();
      const y = await page.evaluate(() => scrollY);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => scrollY)).toBe(y);
      await page.screenshot({
        path: `output/mobile-draft-flow/${engine}-${width}-open-art-ratings.png`,
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
        const start = page.getByTestId("run-start");
        await ready(page, start);
        await expect(start).not.toHaveAttribute("aria-busy", "true");
        await start.tap();
        await page.locator('[data-testid^="candidate-"]').first().tap();
        const field = page.getByTestId("pitch-stage");
        expect(await field.evaluate((e) => getComputedStyle(e).height)).toBe("520px");
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

// Bug: each roll scrolled to the wheel, not the pitch. In short portrait the wheel sat in a fixed
// bottom sheet, so the page stayed where the last slot tap left it and the pitch top was cut off.
// In short landscape and on desktop the picker sat in flow beside or below the pitch.
for (const [label, viewport] of [
  ["short portrait", { width: 390, height: 667 }],
  ["short landscape", { width: 844, height: 390 }],
  ["desktop", { width: 1280, height: 720 }],
] as const) {
  test(`${label} picker opens over the pitch and a pick leaves the pitch on screen`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(
      "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=mobile-flow",
    );
    await ready(page, page.getByTestId("run-start"));
    await expect(page.getByTestId("run-start")).not.toHaveAttribute("aria-busy", "true");
    await page.getByTestId("run-start").tap();
    const top = (testId: string) =>
      page.getByTestId(testId).evaluate((e) => Math.round(e.getBoundingClientRect().top));
    for (let round = 1; round <= 3; round++) {
      await expect(page.getByTestId("round-header")).toHaveText(`Round ${round} of 16`);
      await expect(page.locator('[data-testid^="candidate-"]')).toHaveCount(3);
      const picker = await page.getByTestId("draft-drawer").evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          position: getComputedStyle(e).position,
          offCenter: Math.round(Math.abs(r.top + r.bottom - innerHeight) / 2),
        };
      });
      expect(picker, `round ${round} picker centered`).toEqual({ position: "fixed", offCenter: 0 });
      const fieldOpen = await top("pitch");
      expect(fieldOpen, `round ${round} pitch behind the picker`).toBeGreaterThanOrEqual(0);
      expect(fieldOpen).toBeLessThan(viewport.height / 2);
      // dispatchEvent, not tap: tap scrolls the target into view and would hide the bug.
      await page.locator('[data-testid^="candidate-"]').first().dispatchEvent("click");
      await expect(page.getByTestId("draft-selection-bar")).toBeVisible();
      expect(
        await top("draft-selection-bar"),
        `round ${round} selection bar`,
      ).toBeGreaterThanOrEqual(0);
      const fieldPicked = await top("pitch");
      expect(fieldPicked, `round ${round} pitch after pick`).toBeGreaterThanOrEqual(0);
      expect(fieldPicked).toBeLessThan(viewport.height / 2);
      // tap scrolls a low slot such as the keeper into view, as a player has to.
      await page.locator('[data-testid^="slot-"][data-filled="false"]').first().tap();
    }
    await context.close();
  });
}
