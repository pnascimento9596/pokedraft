import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/wave4-carryovers";
// An iPhone 14 in portrait (notch above, home bar below) and turned to landscape (notch on a side).
const PORTRAIT = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE = { top: 0, bottom: 21, left: 47, right: 47 };
// The content edges with a 47px notch on each side. The 820px-wide pages centre in the 844px
// window, 12px in from each edge, then pad by the 47px inset.
const ROUTES = [
  ["/", { left: 47, right: 797 }],
  ["/daily", { left: 47, right: 797 }],
  ["/how-to-play", { left: 59, right: 785 }],
  ["/history", { left: 59, right: 785 }],
  ["/leaderboard", { left: 59, right: 785 }],
] as const;

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
      const owner = node.parentElement!.getBoundingClientRect();
      if (owner.width <= 1 || owner.height <= 1) continue;
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

test("the home bar inset applies once on /, below the footer text (catches the page's 66px above the footer's 62px)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".site-footer")).toBeVisible();
  expect(await footerBottom(page)).toEqual({ padding: "28px", pagePadding: "32px", textGap: 31 });

  await emulate(page, PORTRAIT);
  await page.goto("/");
  await expect(page.locator(".site-footer")).toBeVisible();
  expect(await footerBottom(page)).toEqual({ padding: "62px", pagePadding: "32px", textGap: 65 });
  await page.screenshot({ path: `${SHOT}/home-footer-notch-390.png` });

  await page.goto("/how-to-play");
  await expect(page.locator("main.page")).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector("main.page")!).paddingBottom),
  ).toBe("66px");
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

  for (const [route, content] of ROUTES) {
    test(`${route} insets its content by the 47px notch once, not 63px (catches the body inset plus the gutter)`, async ({
      page,
    }) => {
      await emulate(page, LANDSCAPE);
      await page.goto(route);
      await expect(page.locator("main.page")).toBeVisible();
      expect(await sides(page)).toEqual({
        header: { left: 47, right: 797 },
        brand: 47,
        page: content,
      });
      expect(await textUnderNotch(page, LANDSCAPE.left)).toEqual([]);
      if (route === "/") await page.screenshot({ path: `${SHOT}/home-landscape-notch-844.png` });
    });
  }
});
