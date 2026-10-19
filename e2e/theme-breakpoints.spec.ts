import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import fixtures from "../scripts/audit/fixtures.json";
import { RUN_151 } from "./pins";

const EDGES = [479, 480, 719, 720, 959, 960, 1199, 1200];
const toggle = (page: Page) => page.getByRole("button", { name: /settings and records/i });

test.use({ reducedMotion: "reduce" });

async function columns(page: Page, from: string, area?: string): Promise<number> {
  return page.locator(from).evaluate((start, wanted) => {
    let el: Element | null = start;
    while (el !== null) {
      const style = getComputedStyle(el);
      if (style.display === "grid" && (wanted === null || style.gridTemplateAreas.includes(wanted)))
        return style.gridTemplateColumns.split(" ").length;
      el = el.parentElement;
    }
    return 0;
  }, area ?? null);
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function startDraft(page: Page): Promise<void> {
  await page.goto(RUN_151.url);
  const header = page.getByTestId("round-header");
  await expect(async () => {
    await page.getByTestId("run-start").click({ timeout: 1_000 });
    await expect(header).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function pixel(page: Page, x: number, y: number): Promise<[number, number, number]> {
  const shot = await page.screenshot();
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * info.channels;
  return [data[at]!, data[at + 1]!, data[at + 2]!];
}

for (const width of EDGES) {
  const two = width >= 960;
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`home is ${two ? "two columns with settings open" : "one column with settings collapsed"} and does not overflow (catches the home split at 1024 instead of 960)`, async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("[data-card]").first()).toBeVisible();
      expect(await columns(page, 'aside[aria-label="Control desk"]')).toBe(two ? 2 : 1);
      expect(await columns(page, "[data-card] >> nth=0")).toBe(two ? 1 : 2);
      if (two) await expect(toggle(page)).toBeHidden();
      else await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
      expect(await overflow(page)).toBe(0);
    });

    test(`draft board is ${two ? "two" : "one"} column${two ? "s" : ""} and does not overflow`, async ({
      page,
    }) => {
      await startDraft(page);
      expect(await columns(page, '[data-testid="round-header"]', "hub")).toBe(two ? 2 : 1);
      expect(await overflow(page)).toBe(0);
    });

    test(`results are ${two ? "two" : "one"} column${two ? "s" : ""} and do not overflow`, async ({
      page,
    }) => {
      await page.goto(`/r/${fixtures.shareRun.token}`);
      await expect(page.getByTestId("results-record")).toBeVisible();
      expect(
        await page
          .locator('[class$="_columns"]')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length),
      ).toBe(two ? 2 : 1);
      expect(await overflow(page)).toBe(0);
    });
  });
}

for (const viewport of [
  { width: 960, height: 800 },
  { width: 1024, height: 768 },
]) {
  test(`the two-column home fits the 320px panel and the builder at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const panel = page.locator('aside[aria-label="Control desk"]');
    await expect(panel).toBeVisible();
    expect(await columns(page, 'aside[aria-label="Control desk"]')).toBe(2);
    expect(Math.round((await panel.boundingBox())!.width)).toBe(320);
    const right = await page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll("main *")].map((el) => el.getBoundingClientRect().right),
      ),
    );
    expect(right).toBeLessThanOrEqual(viewport.width);
    expect(await overflow(page)).toBe(0);
  });
}

test.describe("first paint", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a dark system paints the dark vignette in the first frame (regression guard, no RED: the boot script already set data-theme before paint)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/", { waitUntil: "commit" });
    const [r, g, b] = await pixel(page, 2, 300);
    // The vignette runs from #111a2e at its centre to #080d16 at its edge.
    expect(r).toBeGreaterThanOrEqual(0x08);
    expect(r).toBeLessThanOrEqual(0x11);
    expect(g).toBeGreaterThanOrEqual(0x0d);
    expect(g).toBeLessThanOrEqual(0x1a);
    expect(b).toBeGreaterThanOrEqual(0x16);
    expect(b).toBeLessThanOrEqual(0x2e);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("a light system paints the light canvas, with no vignette, in the first frame", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/", { waitUntil: "commit" });
    expect(await pixel(page, 2, 300)).toEqual([0xe7, 0xea, 0xe2]);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("phone picker sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [scheme, fill, ink] of [
    ["light", "rgb(248, 244, 235)", "rgb(30, 36, 25)"],
    ["dark", "rgb(15, 23, 42)", "rgb(248, 250, 252)"],
  ] as const) {
    test(`the open picker follows the ${scheme} theme (catches the night sheet on the light page)`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await startDraft(page);
      const drawer = page.getByTestId("draft-drawer");
      await expect(drawer).toBeVisible();
      await expect(page.locator("[data-drawer][data-choosing]")).toHaveCount(1);
      await expect(drawer).toHaveCSS("background-color", fill);
      await expect(drawer.getByRole("button").first()).toHaveCSS("color", ink);
    });
  }
});

test.describe("a share link that does not decode", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("follows a dark system (catches the light 404 page, whose layout renders on the client without the boot script)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/r/garbage-not-a-token");
    await expect(page.getByRole("region", { name: "Run not found" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 18, 32)");
  });

  test("follows a stored Night choice on a light system", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pokedraft:theme", JSON.stringify("dark")));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/r/garbage-not-a-token");
    await expect(page.getByRole("region", { name: "Run not found" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
