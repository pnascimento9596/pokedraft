import { expect, test, type Locator, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { RUN_KEYBOARD } from "./pins";

test.use({ reducedMotion: "reduce" });

// Press Tab (or Shift+Tab) until `target` holds focus, the way a keyboard user walks to a control.
async function tabTo(page: Page, target: Locator, key: "Tab" | "Shift+Tab" = "Tab") {
  for (let presses = 0; presses < 120; presses++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`${key} never reached ${target}`);
}

test("a whole 151 draft by keyboard alone", async ({ page }) => {
  await page.goto(RUN_KEYBOARD.url);
  await tabTo(page, page.getByTestId("run-start"));
  await page.keyboard.press("Enter");

  const header = page.getByTestId("round-header");
  for (let round = 1; round <= 16; round++) {
    await expect(header).toHaveText(`Round ${round} of 16`);
    // Candidates sit above the pitch in the DOM, so a player on a slot walks back to them.
    await tabTo(page, page.locator('[data-testid^="candidate-"]').first(), "Shift+Tab");
    await page.keyboard.press("Enter");
    await tabTo(page, page.locator('[data-testid^="slot-"][data-filled="false"]').first());
    await page.keyboard.press("Enter");
  }
  await expect(header).toHaveText("Draft complete");
  await tabTo(page, page.getByTestId("see-results"), "Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("results-record")).toHaveText(RUN_KEYBOARD.record);
});

test("the picker opens by keyboard, keeps focus inside and closes on Escape", async ({ page }) => {
  await page.goto("/");
  const slot = page.getByRole("button", { name: "Empty LCB slot" });
  await tabTo(page, slot);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Pick for LCB" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("searchbox")).toBeFocused();

  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(slot).toBeFocused();
});

test("every tab stop on / shows a focus ring", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const missing: string[] = [];
  const seen = new Set<string>();
  for (let stop = 0; stop < 150; stop++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el === null || el === document.body) return null;
      const focused = getComputedStyle(el);
      const outline = focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) >= 2;
      const shadow = focused.boxShadow;
      // A box-shadow ring counts only if it is not there without focus. After a key press,
      // focus() keeps :focus-visible, so the next Tab still starts from this element.
      el.blur();
      const resting = getComputedStyle(el).boxShadow;
      el.focus();
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
      const label = `${el.tagName.toLowerCase()} "${name}"`;
      return {
        key: `${label} @${el.getBoundingClientRect().top}`,
        label,
        ring: outline || (shadow !== "none" && shadow !== resting),
      };
    });
    if (info === null) continue;
    if (seen.has(info.key)) break;
    seen.add(info.key);
    if (!info.ring) missing.push(info.label);
  }
  expect(seen.size).toBeGreaterThan(20);
  expect(missing).toEqual([]);
});

// Match 0 of this run stops for an injury at 16', then at half time (engine 6).
const MANAGED =
  "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-a11y-47";
const MATCHDAY_SHOT = "docs/reports/accessible-controls";

test("a managed live match by keyboard: Space and 2 on the player, focus on each stop and back, and the skip warning, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "live" }),
      );
  });
  await page.goto(MANAGED);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("prematch-go").click();

  const player = page.getByTestId("match-player");
  const toggle = page.getByTestId("play-toggle");
  const speed = page.getByTestId("speed-toggle");
  await expect(toggle).toHaveText("Pause");

  // A focused button keeps Space as its own click: one press turns 2x on, the next turns it off.
  await speed.focus();
  await page.keyboard.press(" ");
  await expect(speed).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press(" ");
  await expect(speed).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveText("Pause");

  await page.getByTestId("match-hud").click();
  await expect(player).toBeFocused();
  const scrolled = await page.evaluate(() => scrollY);
  await page.keyboard.press(" ");
  await expect(toggle).toHaveText("Resume");
  await page.keyboard.press(" ");
  await expect(toggle).toHaveText("Pause");
  expect(await page.evaluate(() => scrollY)).toBe(scrolled);
  await page.keyboard.press("2");
  await expect(speed).toHaveAttribute("aria-pressed", "true");

  const prompt = page.locator('[role="dialog"][data-testid^="stop-"]');
  const kinds: string[] = [];
  for (let i = 0; i < 12; i++) {
    await expect(prompt).toBeVisible({ timeout: 40_000 });
    const kind = (await prompt.getAttribute("data-testid"))!;
    kinds.push(kind);
    expect(await prompt.evaluate((p) => p.contains(document.activeElement))).toBe(true);
    if (kind === "stop-halftime") break;
    await expect(page.locator(":focus")).toBeChecked();
    if (kinds.length === 1)
      await page.screenshot({ path: `${MATCHDAY_SHOT}/390-injury-focus.png` });
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("injury-confirm")).toBeFocused();
    await page.keyboard.press("Enter");
  }
  console.log(`stops answered by keyboard: ${kinds.join(", ")}`);
  expect(kinds).toEqual(["stop-injury", "stop-halftime"]);
  await expect(page.getByTestId("stop-go")).toBeFocused();
  await page.screenshot({ path: `${MATCHDAY_SHOT}/390-halftime-focus.png` });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stop-halftime")).toHaveCount(0);
  await expect(player).toBeFocused();

  await tabTo(page, page.getByTestId("skip-ft"));
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("skip-warning")).toBeVisible();
  await expect(page.getByTestId("skip-confirm")).toBeFocused();
  await page.screenshot({ path: `${MATCHDAY_SHOT}/390-skip-warning.png` });
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("skip-cancel")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("skip-warning")).toHaveCount(0);
  await expect(page.getByTestId("skip-ft")).toBeFocused();
  await expect(player).toHaveAttribute("data-stage", "play");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("fulltime")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [360, 320]) {
  test(`the skip warning fits at ${width}px with 44px buttons and no sideways scroll`, async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "the viewport is set explicitly");
    await page.setViewportSize({ width, height: 740 });
    await page.addInitScript(() => {
      if (localStorage.getItem("pokedraft:panel") === null)
        localStorage.setItem(
          "pokedraft:panel",
          JSON.stringify({ managerMode: true, matchView: "live" }),
        );
    });
    await page.goto(MANAGED);
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await page.getByTestId("see-results").click();
    await page.getByTestId("prematch-go").click();
    await page.getByTestId("play-toggle").click();
    await page.getByTestId("skip-ft").click();
    const warning = page.getByTestId("skip-warning");
    await expect(warning).toBeVisible();
    await warning.scrollIntoViewIfNeeded();
    for (const id of ["skip-confirm", "skip-cancel"]) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `${MATCHDAY_SHOT}/${width}-skip-warning.png` });
  });
}
