import { expect, test } from "@playwright/test";
import { touchScroll } from "./mobile/helpers";
import { RUN_151 } from "./pins";

const formations = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "3-5-2", "3-4-3", "3-4-2-1", "5-3-2"];
for (const width of [375, 390, 1280]) {
  test(`Silph Stadium separates all eleven HTML hitboxes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const formation of formations) {
      await page.getByLabel("Formation", { exact: true }).selectOption(formation);
      const boxes = await page.locator('[data-testid^="slot-s"]').evaluateAll((elements) =>
        elements.map((element) => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      expect(boxes).toHaveLength(11);
      for (const [i, a] of boxes.entries()) {
        expect(a.width, `${formation} slot ${i}`).toBeGreaterThanOrEqual(44);
        expect(a.height).toBeGreaterThanOrEqual(44);
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.width).toBeLessThanOrEqual(width);
        for (const b of boxes.slice(i + 1)) {
          const overlap =
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 &&
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;
          expect(overlap, `${formation} overlapping starter hitboxes`).toBe(false);
        }
      }
      for (const slot of await page.locator('[data-testid^="slot-s"]').all()) {
        await slot.scrollIntoViewIfNeeded();
        expect(
          await slot.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              document
                .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
                ?.closest("[data-slot-key]") === element
            );
          }),
          `${formation} center tap must reach its HTML button`,
        ).toBe(true);
      }
    }
  });
}

test("bare play uses the existing Open Squad First default, malformed links stay errors", async ({
  page,
}) => {
  await page.goto("/play");
  await expect(page.getByTestId("run-start")).toBeVisible();
  await expect(page.getByText("Open", { exact: true })).toBeVisible();
  await expect(page.getByText("Squad First", { exact: true })).toBeVisible();
  await page.goto("/play?mode=bogus&f=not-a-formation");
  await expect(
    page.getByRole("heading", { name: "That challenge link does not work" }),
  ).toBeVisible();
  await expect(page.getByTestId("run-start")).toHaveCount(0);
});

for (const width of [375, 390]) {
  test(`touch slot opens drawer and candidate placement minimizes it at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(
      "/play?mode=cup8&f=3-5-2&order=squadFirst&g=123456789&style=classic3&seed=silph-touch",
    );
    await page.getByTestId("run-start").tap();
    await page.getByRole("button", { name: "Hide players" }).tap();
    await page.getByTestId("slot-s5").tap();
    await expect(page.getByRole("button", { name: "Hide players" })).toBeVisible();
    await page.locator('[data-testid^="candidate-"]').first().tap();
    await expect(page.locator('[data-testid^="candidate-"]').first()).not.toBeVisible();
    await page.getByTestId("slot-s5").tap();
    await expect(page.getByTestId("slot-s5")).toHaveAttribute("data-filled", "true");
    await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
    await expect(page.getByRole("button", { name: "Reroll type 3/3, 3 left" })).toContainText(
      "3/3",
    );
    await context.close();
  });
}

test("filled chemistry SVG endpoints share the exact starter projection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Randomize", exact: true }).click();
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  expect(await page.locator("[data-chemistry]").count()).toBeGreaterThan(0);
  expect(
    await page.locator('[data-testid^="slot-"]').evaluateAll((cards) =>
      cards.every((card) => {
        const art = card.querySelector("img")?.getBoundingClientRect();
        const name = card.querySelector('[id$="-name"]')?.getBoundingClientRect();
        return art !== undefined && name !== undefined && art.bottom <= name.top + 0.5;
      }),
    ),
    "artwork must stay above species names",
  ).toBe(true);
  const mismatch = await page.evaluate(() => {
    const refs: Record<string, string> = {
      GK: "s0",
      LB: "s1",
      LCB: "s2",
      RCB: "s3",
      RB: "s4",
      CDM: "s5",
      LCM: "s6",
      RCM: "s7",
      LW: "s8",
      ST: "s9",
      RW: "s10",
    };
    return [...document.querySelectorAll("[data-chemistry]")].some((line) => {
      const labels = line
        .getAttribute("data-chemistry")!
        .split("4-3-3.")
        .slice(1)
        .map((label) => label.replace(/-$/, ""));
      return labels.some((label, index) => {
        const card = document.querySelector<HTMLElement>(`[data-slot-key="${refs[label]}"]`)!;
        const x = Number(line.getAttribute(`x${index + 1}`));
        const y = Number(line.getAttribute(`y${index + 1}`));
        if (
          Math.abs(parseFloat(card.style.left) - x) > 0.0001 ||
          Math.abs(parseFloat(card.style.top) - y) > 0.0001
        )
          return true;
        const anchor = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        anchor.setAttribute("cx", String(x));
        anchor.setAttribute("cy", String(y));
        anchor.setAttribute("r", "0.001");
        anchor.style.opacity = "0";
        line.closest("svg")!.appendChild(anchor);
        const point = anchor.getBoundingClientRect();
        anchor.remove();
        const box = card.getBoundingClientRect();
        const px = point.x + point.width / 2,
          py = point.y + point.height / 2;
        return px < box.left || px > box.right || py < box.top || py > box.bottom;
      });
    });
  });
  expect(mismatch).toBe(false);
});

test("touch completes all sixteen 151 picks, swaps players, and preserves the seeded result at 375px", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(RUN_151.url);
  await page.getByTestId("run-start").tap();
  for (let round = 1; round <= 16; round++) {
    await expect(page.getByTestId("round-header")).toHaveText(`Round ${round} of 16`);
    await page.locator('[data-testid^="candidate-"]').first().tap();
    await page.locator('[data-testid^="slot-"][data-filled="false"]').first().tap();
  }
  await expect(page.getByTestId("round-header")).toHaveText("Draft complete");
  const a = page.getByTestId("slot-s6"),
    b = page.getByTestId("slot-s7");
  const names = [await a.getAttribute("aria-label"), await b.getAttribute("aria-label")];
  await a.tap();
  await b.tap();
  await expect(a).toHaveAttribute("aria-label", names[1]!.replace("RCM ", "LCM "));
  await expect(b).toHaveAttribute("aria-label", names[0]!.replace("LCM ", "RCM "));
  await a.tap();
  await b.tap();
  await page.getByTestId("see-results").tap();
  await expect(page.getByTestId("results-record")).toHaveText(RUN_151.record);
  await context.close();
});

test("grass swipes scroll the page and filled HTML cards still drag-swap", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Randomize", exact: true }).click();
  const a = page.getByTestId("slot-s6"),
    b = page.getByTestId("slot-s7");
  await expect(a).toHaveAttribute("data-filled", "true");
  await expect(b).toHaveAttribute("data-filled", "true");
  await a.scrollIntoViewIfNeeded();
  const names = [await a.getAttribute("aria-label"), await b.getAttribute("aria-label")];
  const ar = await a.boundingBox(),
    br = await b.boundingBox();
  await page.mouse.move(ar!.x + ar!.width / 2, ar!.y + ar!.height / 2);
  await page.mouse.down();
  await page.mouse.move(br!.x + br!.width / 2, br!.y + br!.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(a).toHaveAttribute("aria-label", names[1]!.replace("RCM ", "LCM "));
  await expect(b).toHaveAttribute("aria-label", names[0]!.replace("LCM ", "RCM "));
  const point = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="pitch-stage"]')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll('[data-testid^="slot-"]')].map((el) =>
      el.getBoundingClientRect(),
    );
    for (
      let y = Math.max(180, stage.top + 40);
      y < Math.min(innerHeight - 40, stage.bottom - 40);
      y += 10
    ) {
      for (let x = stage.left + 16; x < stage.right - 16; x += 10) {
        if (
          !document.elementFromPoint(x, y)?.closest("button") &&
          cards.every(
            (r) => x < r.left - 32 || x > r.right + 32 || y < r.top - 32 || y > r.bottom + 32,
          )
        )
          return { x, y };
      }
    }
    return null;
  });
  expect(point).not.toBeNull();
  const before = await page.evaluate(() => scrollY);
  await touchScroll(page, point!, 160);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await context.close();
});
