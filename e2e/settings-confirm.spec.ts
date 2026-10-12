import { expect, test, type Page } from "@playwright/test";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Settings confirmed?" });
const formation = (page: Page) => page.getByLabel("Formation");

test.describe("settings panel and Play confirmation on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("settings are visible on first load without tapping anything", async ({ page }) => {
    await page.goto("/");
    await expect(formation(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your records" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hide settings and records" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("Play 8-0, Yes lands on the matching /play URL and Start drafts", async ({ page }) => {
    await page.goto("/");
    await formation(page).selectOption("4-4-2");
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText("4-4-2");
    expect(new URL(page.url()).pathname).toBe("/");
    await dialog(page).getByRole("button", { name: "Yes, play" }).click();
    await expect(page).toHaveURL("/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=open");
    await page.getByTestId("run-start").click();
    await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  });

  test("Back from /play returns to a home page with no dialog blocking it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Play 151 Challenge" }).click();
    await dialog(page).getByRole("button", { name: "Yes, play" }).click();
    await expect(page).toHaveURL("/play?mode=kanto151&f=4-3-3&order=squadFirst");
    await page.goBack();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Play 151 Challenge" }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("Play 151 lists only formation and order", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Play 151 Challenge" }).click();
    await expect(dialog(page).locator("dt")).toHaveText(["Formation", "Order"]);
    await expect(dialog(page).locator("dd")).toHaveText(["4-3-3", "Squad First"]);
  });

  test("No leaves the page on / with Formation visible and focused", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await dialog(page).getByRole("button", { name: "No, edit settings" }).click();
    await expect(dialog(page)).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(formation(page)).toBeVisible();
    await expect(formation(page)).toBeFocused();
  });

  test("Escape behaves as No", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(dialog(page).getByRole("button", { name: "Yes, play" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(formation(page)).toBeFocused();
  });

  test("the dialog fits 320, 360 and 390 px with 44 px buttons", async ({ page }) => {
    await page.goto("/");
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
      const box = dialog(page);
      await expect(box).toBeVisible();
      const overflow = await box.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow, `${width}px dialog overflow`).toBeLessThanOrEqual(0);
      const page_ = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(page_, `${width}px page overflow`).toBeLessThanOrEqual(0);
      for (const name of ["Yes, play", "No, edit settings"]) {
        const b = await box.getByRole("button", { name }).boundingBox();
        expect(b!.height, `${name} at ${width}px`).toBeGreaterThanOrEqual(44);
      }
      await page.keyboard.press("Escape");
      await expect(box).toHaveCount(0);
    }
  });
});

test.describe("settings panel and Play confirmation on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop viewport only");
  test.use({ viewport: { width: 1280, height: 800 } });

  test("settings are visible on first load and Yes starts the run", async ({ page }) => {
    await page.goto("/");
    await expect(formation(page)).toBeVisible();
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Yes, play" }).click();
    await expect(page).toHaveURL("/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open");
    await page.getByTestId("run-start").click();
    await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  });

  test("No focuses Formation and the URL stays /", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Play 151 Challenge" }).click();
    await dialog(page).getByRole("button", { name: "No, edit settings" }).click();
    await expect(formation(page)).toBeFocused();
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
