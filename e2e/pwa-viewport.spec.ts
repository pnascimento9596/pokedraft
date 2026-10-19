import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/pwa-viewport";
const PLAY =
  "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-pwa-viewport";
// An iPhone 14 in portrait: the notch above, the home indicator below.
const NOTCH = { top: 47, bottom: 34, left: 0, right: 0 };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

async function emulateNotch(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: NOTCH });
}

async function edges(page: Page) {
  return page.evaluate(() => ({
    headerTop: getComputedStyle(document.querySelector(".site-header")!).paddingTop,
    headerHeight: document.querySelector(".site-header")!.getBoundingClientRect().height,
    pageBottom: getComputedStyle(document.querySelector("main.page")!).paddingBottom,
  }));
}

async function showDraftHint(page: Page) {
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  await page.locator('[data-testid^="slot-"][data-filled="false"]').first().dispatchEvent("click");
  const hint = page.getByTestId("draft-hint");
  await expect(hint).toBeVisible();
  return hint;
}

test("/manifest.webmanifest serves", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const body = await response.json();
  expect(body).toMatchObject({ name: "pokedraft", display: "standalone", start_url: "/" });
  for (const src of [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
  ]) {
    const icon = await request.get(src);
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"], src).toBe("image/png");
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(apple).toMatch(/^\/apple-icon\.png\?/);
  const appleIcon = await request.get(apple!);
  expect(appleIcon.status()).toBe(200);
  expect(appleIcon.headers()["content-type"]).toBe("image/png");
});

test("page bottom padding includes the inset", async ({ page }) => {
  await page.goto("/");
  expect(await edges(page)).toEqual({ headerTop: "6px", headerHeight: 57, pageBottom: "32px" });

  await emulateNotch(page);
  await page.goto("/");
  expect(await edges(page)).toEqual({ headerTop: "53px", headerHeight: 104, pageBottom: "66px" });
  await page.screenshot({ path: `${SHOT}/home-notch-390.png` });

  await page.goto("/how-to-play");
  expect((await edges(page)).pageBottom).toBe("66px");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: `${SHOT}/how-to-play-bottom-notch-390.png` });
});

test("desktop header top padding includes the inset", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  expect((await edges(page)).headerTop).toBe("12px");

  await emulateNotch(page);
  await page.goto("/");
  expect((await edges(page)).headerTop).toBe("59px");
});

test("draft toast keeps its 8px top without a notch", async ({ page }) => {
  const hint = await showDraftHint(page);
  expect(await hint.evaluate((el) => getComputedStyle(el).top)).toBe("8px");
});

test("draft toast sits below the notch", async ({ page }) => {
  await emulateNotch(page);
  const hint = await showDraftHint(page);
  expect(await hint.evaluate((el) => getComputedStyle(el).top)).toBe("55px");
  await page.screenshot({ path: `${SHOT}/draft-toast-notch-390.png` });
});

test("body overscroll none on /play, auto on /", async ({ page }) => {
  const overscroll = () => page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY);
  await page.goto("/");
  await expect(page.locator("main.page")).toBeVisible();
  expect(await overscroll()).toBe("auto");

  await page.goto(PLAY);
  await expect(page.getByTestId("run-start")).toBeVisible();
  expect(await overscroll()).toBe("auto");
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  expect(await overscroll()).toBe("none");
});
