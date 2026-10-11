import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-kb");
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
  await expect(page.getByTestId("results-record")).toHaveText("4-0-1");
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
