import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/resilience-a11y";
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-coach-mark";
const LIGHT = "#E7EAE2";
const DARK = "#0B1220";

// This spec plays a first-time visitor, so it starts without the stored coach mark key.
test.use({ storageState: { cookies: [], origins: [] } });

function hydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /hydrat|did not match/i.test(msg.text())) errors.push(msg.text());
  });
  return errors;
}

test("skip link focuses content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/how-to-play");
  await expect(page.getByRole("heading", { level: 1, name: "How to play" })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.screenshot({ path: `${SHOT}/skip-link-focused-390.png` });
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("content");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.querySelector("#content")!.contains(document.activeElement)),
  ).toBe(true);
});

test("nav marks the current page on /, /daily and /history", async ({ page }) => {
  const errors = hydrationErrors(page);
  for (const [path, label] of [
    ["/", "Play"],
    ["/daily", "Daily"],
    ["/history", "History"],
  ] as const) {
    await page.goto(path);
    const current = page.getByRole("navigation", { name: "Main" }).locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(label);
  }
  await page.goto("/how-to-play");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Daily" }).click();
  await expect(page).toHaveURL(/\/daily$/);
  await expect(
    page.getByRole("navigation", { name: "Main" }).locator('[aria-current="page"]'),
  ).toHaveText("Daily");
  expect(errors).toEqual([]);
});

test("theme-color meta follows an explicit light choice under a dark OS", async ({ page }) => {
  const errors = hydrationErrors(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded") === null) {
      localStorage.setItem("pokedraft:theme", JSON.stringify("light"));
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  const meta = page.locator('meta[name="theme-color"]');
  const root = page.locator("html");
  await expect(meta).toHaveCount(1);
  await expect(meta).toHaveAttribute("content", LIGHT);
  await expect(root).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Theme: day. Change theme", exact: true }).click();
  await expect(meta).toHaveAttribute("content", DARK);
  await expect(root).toHaveAttribute("data-theme", "dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(meta).toHaveAttribute("content", LIGHT);
  await expect(root).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Theme: auto. Change theme", exact: true }),
  ).toBeVisible();
  await expect(meta).toHaveAttribute("content", LIGHT);
  expect(errors).toEqual([]);
});

test("coach mark shows once", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  const coach = page.getByTestId("coach-mark");
  await expect(coach.locator("p")).toHaveText(
    "Watch the spin, pick one that matches, place it on the pitch. Fill all 16 to play the cup.",
  );
  await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible({
    timeout: 10_000,
  });
  await coach.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/coach-mark-390.png` });
  await page.locator('[data-testid^="candidate-"]').first().click();
  await page.locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])').first().click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 2 of 16");
  await expect(coach).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("pokedraft:coach:draft"))).toBe("true");

  await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-coach-mark-2");
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
  await expect(coach).toHaveCount(0);
});

test("the desktop draft hub has no CSS-generated Trainer Dugout label", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
  const hub = page.locator("button", { hasText: "Challenge Hub" }).locator("xpath=../..");
  expect(await hub.evaluate((el) => getComputedStyle(el, "::before").content)).toBe("none");
});

test("How to play covers Daily, Manager mode, Live match and the leaderboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/how-to-play");
  for (const name of ["Daily", "Manager mode", "Live match", "Leaderboard"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("on a scale from 0 to 1000")).toBeVisible();
  await page.screenshot({ path: `${SHOT}/how-to-play-390.png`, fullPage: true });
});
