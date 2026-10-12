import { devices, expect, test } from "@playwright/test";

test.describe("UI foundation", () => {
  test("theme boot script applies stored theme before hydration", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      localStorage.setItem("pokedraft:theme", JSON.stringify("light"));
    });

    // Abort JS scripts under /_next/static/ so React never hydrates,
    // while allowing CSS stylesheets to load so computed styles are applied.
    await page.route("**/_next/static/**", (route) => {
      if (route.request().resourceType() === "script" || route.request().url().endsWith(".js")) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto("/");
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(231, 234, 226)");
  });

  test("hover gating in touch context vs desktop context", async ({ browser }) => {
    const mobileContext = await browser.newContext({
      ...devices["Pixel 7"],
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("/");

    const mobileHover = await mobilePage.evaluate(
      () => window.matchMedia("(hover: hover)").matches,
    );
    expect(mobileHover).toBe(false);

    const mobileBtn = mobilePage.locator(".btn:visible").first();
    const mobileBorderBefore = await mobileBtn.evaluate(
      (el) => window.getComputedStyle(el).borderColor,
    );
    await mobileBtn.hover();
    await mobilePage.waitForTimeout(150);
    const mobileBorderAfter = await mobileBtn.evaluate(
      (el) => window.getComputedStyle(el).borderColor,
    );
    expect(mobileBorderAfter).toBe(mobileBorderBefore);
    await mobileContext.close();

    const desktopContext = await browser.newContext();
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto("/");

    const desktopHover = await desktopPage.evaluate(
      () => window.matchMedia("(hover: hover)").matches,
    );
    expect(desktopHover).toBe(true);

    const desktopBtn = desktopPage.locator(".btn:visible").first();
    const desktopBorderBefore = await desktopBtn.evaluate(
      (el) => window.getComputedStyle(el).borderColor,
    );
    await desktopBtn.hover();
    await expect
      .poll(async () => desktopBtn.evaluate((el) => window.getComputedStyle(el).borderColor))
      .not.toBe(desktopBorderBefore);
    await desktopContext.close();
  });

  test("theme boot script causes no hydration warnings in browser console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("pokedraft:theme", JSON.stringify("light"));
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const hydrationErrors = consoleErrors.filter(
      (err) =>
        err.includes("Hydration") ||
        err.includes("hydrat") ||
        err.includes("did not match"),
    );
    expect(hydrationErrors).toEqual([]);
  });
});
