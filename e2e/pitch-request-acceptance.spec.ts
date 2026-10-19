import { chromium, expect, test, webkit } from "@playwright/test";
import fixture from "../scripts/audit/fixtures.json";
import { PLAY_8_0, ready } from "./mobile/scenes";

for (const engine of ["chromium", "webkit"] as const) {
  test(`${engine} phone pitch shows Crabominable on one line with an ellipsis and its complete name in the card's accessible name`, async ({
    baseURL,
  }) => {
    const browser = await { chromium, webkit }[engine].launch();
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(() =>
        localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true })),
      );
      await page.goto("/");
      const slot = page.getByTestId("slot-s8");
      await ready(page, slot);
      await slot.click();
      await page.getByRole("searchbox").fill("Crabominable");
      await page.getByTestId("pick-740").click();
      await expect(slot).toHaveAttribute("data-filled", "true");
      const name = slot.locator('[id$="-name"]');
      await expect(name).toHaveText("Crabominable");
      // Below 540px a name takes one line and an overlong one ends in an ellipsis
      // (docs/decisions/pitch-density-drag.md). The full name stays in the card's accessible name.
      const line = await name.evaluate((e) => {
        const cs = getComputedStyle(e);
        return {
          whiteSpace: cs.whiteSpace,
          textOverflow: cs.textOverflow,
          clippedVertically: e.scrollHeight > e.clientHeight,
        };
      });
      expect(line).toEqual({
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        clippedVertically: false,
      });
      await expect(slot).toHaveAccessibleName(/Crabominable/);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("the fan disclaimer is on home only, not the lobby, draft or shared results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-footer")).toHaveCount(1);
  await expect(page.locator(".site-footer")).toContainText("Fan project, not affiliated");
  await page.goto(PLAY_8_0);
  await expect(page.locator(".site-footer")).toHaveCount(0);
  const start = page.getByTestId("run-start");
  await ready(page, start);
  await start.click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await page.goto(`/r/${fixture.shareRun.token}`);
  await expect(page.getByTestId("results-score")).toBeVisible();
  await expect(page.locator(".site-footer")).toHaveCount(0);
});

test("all eight phone opponent-round labels fit their controls without text clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(PLAY_8_0);
  const buttons = page.getByRole("list", { name: "Cup rounds" }).getByRole("button");
  await expect(buttons).toHaveCount(8);
  const clipped = await buttons.evaluateAll((elements) =>
    elements
      .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight)
      .map((e) => e.textContent),
  );
  expect(clipped).toEqual([]);
});
