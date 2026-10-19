import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/wave4-carryovers";
// An iPhone 14 in portrait (notch above, home bar below) and turned to landscape (notch on a side).
const PORTRAIT = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE = { top: 0, bottom: 21, left: 47, right: 47 };
const ROUTES = ["/", "/how-to-play", "/history", "/leaderboard", "/daily"];

async function emulate(page: Page, insets: typeof PORTRAIT): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
}

async function footerBottom(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const footer = document.querySelector(".site-footer")!;
    const range = document.createRange();
    range.selectNodeContents(footer);
    const rects = [...range.getClientRects()];
    return {
      padding: getComputedStyle(footer).paddingBottom,
      pagePadding: getComputedStyle(document.querySelector("main.page")!).paddingBottom,
      textGap: Math.round(window.innerHeight - Math.max(...rects.map((r) => r.bottom))),
    };
  });
}

async function sides(page: Page) {
  return page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector(sel)!;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        left: Math.round(rect.left + parseFloat(style.paddingLeft)),
        right: Math.round(rect.right - parseFloat(style.paddingRight)),
      };
    };
    return {
      header: box(".site-header"),
      brand: Math.round(
        document.querySelector(".site-header__brand")!.getBoundingClientRect().left,
      ),
      page: box("main.page"),
    };
  });
}

/** Every piece of visible text that starts or ends inside the left or right inset strip. */
async function textUnderNotch(page: Page, inset: number) {
  return page.evaluate((side) => {
    const width = window.innerWidth;
    const hits: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      if (text === "") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width === 0 || r.bottom <= 0 || r.top >= window.innerHeight) continue;
        if (r.left < side || r.right > width - side) hits.push(`${text.slice(0, 30)} @${r.left}`);
      }
    }
    return hits;
  }, inset);
}

test("home footer bottom padding stays 28px under a home bar (catches the doubled inset, 62px)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".site-footer")).toBeVisible();
  const flat = await footerBottom(page);
  expect({ padding: flat.padding, pagePadding: flat.pagePadding }).toEqual({
    padding: "28px",
    pagePadding: "32px",
  });

  await emulate(page, PORTRAIT);
  await page.goto("/");
  await expect(page.locator(".site-footer")).toBeVisible();
  const notch = await footerBottom(page);
  expect({ padding: notch.padding, pagePadding: notch.pagePadding }).toEqual({
    padding: "28px",
    pagePadding: "66px",
  });
  test.info().annotations.push({ type: "footer text gap", description: `${notch.textGap}px` });
  await page.screenshot({ path: `${SHOT}/home-footer-notch-390.png` });
});

test.describe("landscape at 844x390", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
  });

  test("without a notch the gutters stay 16px (regression guard, no RED: behaviour already correct)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main.page")).toBeVisible();
    expect(await sides(page)).toEqual({
      header: { left: 16, right: 828 },
      brand: 16,
      page: { left: 16, right: 828 },
    });
  });

  for (const route of ROUTES) {
    test(`${route} insets its content by the 47px notch once, not 63px (catches the body inset plus the gutter)`, async ({
      page,
    }) => {
      await emulate(page, LANDSCAPE);
      await page.goto(route);
      await expect(page.locator("main.page")).toBeVisible();
      expect(await sides(page)).toEqual({
        header: { left: 47, right: 797 },
        brand: 47,
        page: { left: 47, right: 797 },
      });
      expect(await textUnderNotch(page, LANDSCAPE.left)).toEqual([]);
      if (route === "/") await page.screenshot({ path: `${SHOT}/home-landscape-notch-844.png` });
    });
  }
});
