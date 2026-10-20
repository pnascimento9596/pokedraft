import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { decodeToken, encodeToken } from "../src/engine/token";
import { LIVE_GOLDEN_CUP8 } from "./pins";

const SHOT = "docs/reports/share-sheet";
// e2e/share.spec.ts's run: cup8 Open 4-3-3 on engine 3, 1-1-1, Team Score 283, out in the group.
const RUN =
  "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwiMDE0OGVhNzFlMWFjNTFlMyIsW1sicCIsNzQ5LCJzMCJdLFsicCIsNjMsInMxIl0sWyJwIiw5NDQsInMyIl0sWyJwIiwyNywiczMiXSxbInAiLDgyMSwiczQiXSxbInAiLDY1NiwiczUiXSxbInAiLDIwMCwiczYiXSxbInAiLDUyNCwiczciXSxbInAiLDI2OSwiczgiXSxbInAiLDQzMywiczkiXSxbInAiLDU0MywiczEwIl0sWyJwIiw5NDgsImIwIl0sWyJwIiw1MjksImIxIl0sWyJwIiw4MzQsImIyIl0sWyJwIiwzOTMsImIzIl0sWyJwIiwyNSwiYjQiXV1d";
const RUN_PATH = `/r/pd3?t=${RUN.slice(4)}`;
const DESCRIPTION = "Out in the group stage with 4-3-3. Draft your own XI on pokedraft.";
const ALT = "pokedraft run card: 1-1-1, Team Score 283";

function metaContent(html: string, key: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<meta [^>]*>/g) ?? []) {
    if (!tag.includes(`property="${key}"`) && !tag.includes(`name="${key}"`)) continue;
    out.push(/content="([^"]*)"/.exec(tag)?.[1] ?? "");
  }
  return out;
}

test.describe("link preview metadata (catches a preview with no description or an alt that hides the result)", () => {
  test("/r server HTML carries the description and the card alt", async ({ request }) => {
    const html = await (await request.get(RUN_PATH)).text();
    expect(
      ["description", "og:description", "twitter:description", "og:image:alt"].map((k) =>
        metaContent(html, k),
      ),
    ).toEqual([[DESCRIPTION], [DESCRIPTION], [DESCRIPTION], [ALT]]);
    const [image] = metaContent(html, "og:image");
    expect(new URL(image!).pathname).toBe(`/r/${RUN}/opengraph-image`);
  });

  test("the passcode gate preview carries the same description and alt", async ({ request }) => {
    const html = await (await request.get(`/gate?next=${encodeURIComponent(RUN_PATH)}`)).text();
    expect([metaContent(html, "og:description"), metaContent(html, "og:image:alt")]).toEqual([
      [DESCRIPTION],
      [ALT],
    ]);
  });
});

async function recordShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { sheets: unknown[] };
    w.sheets = [];
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        w.sheets.push({
          title: data.title,
          text: data.text,
          url: data.url,
          files: (data.files ?? []).map((f) => f.name),
        });
      },
    });
  });
}

function cardRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.pathname === "/card") seen.push(`${url.pathname}${url.search}`);
  });
  return seen;
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Share opens the sheet with the run text, and Download shares the prefetched card", async ({
    page,
  }) => {
    await recordShareSheet(page);
    const cards = cardRequests(page);
    await page.goto(RUN_PATH);
    await expect(page.getByTestId("results-record")).toHaveText("1-1-1");
    await expect.poll(() => cards.length, { timeout: 10_000 }).toBe(1);

    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByText("Link shared", { exact: true })).toBeVisible();
    const origin = new URL(page.url()).origin;
    await page.getByRole("button", { name: "Download image" }).click();
    await expect(page.getByText("Image shared", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { sheets: unknown[] }).sheets)).toEqual([
      {
        title: "pokedraft",
        text: "1-1-1, Team Score 283. Beat it?",
        url: `${origin}${RUN_PATH}`,
        files: [],
      },
      {
        text: "1-1-1, Team Score 283. Beat it?",
        url: `${origin}${RUN_PATH}`,
        files: ["pokedraft-run.png"],
      },
    ]);
    expect(cards).toEqual([`/card?t=${RUN}`]);
    await page.screenshot({ path: `${SHOT}/share-sheet-stubbed-390.png` });
  });

  for (const width of [390, 360, 320]) {
    test(`a blocked clipboard shows the link in a Link field at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) },
        });
      });
      await page.goto(RUN_PATH);
      await expect(page.getByTestId("results-record")).toHaveText("1-1-1");
      await page.getByRole("button", { name: "Share", exact: true }).click();
      const field = page.getByRole("textbox", { name: "Link" });
      await expect(field).toHaveValue(`${new URL(page.url()).origin}${RUN_PATH}`);
      await expect(field).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/manual-link-${width}.png` });
    });
  }
  test("a blocked clipboard shows the goal link and the Builder link in a Link field at 390px", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) },
      });
    });
    await page.goto(RUN_PATH);
    const goal = page.getByTestId("share-goal").first();
    await goal.click();
    const origin = new URL(page.url()).origin;
    const goalField = page.getByRole("textbox", { name: "Link" });
    await expect(goalField).toHaveValue(new RegExp(`^${origin}/r/pd3\\?t=.+&watch=\\d+&at=\\d+$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await goalField.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/manual-goal-link-390.png` });

    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    await page.getByRole("button", { name: "Share link" }).click();
    const builderField = page
      .getByRole("group", { name: "Builder actions" })
      .getByRole("textbox", { name: "Link" });
    await expect(builderField).toHaveValue(new RegExp(`^${origin}/\\?b=.+$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await builderField.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOT}/manual-builder-link-390.png` });
  });
});

test.describe("on a desktop", () => {
  test.use({ hasTouch: false, isMobile: false });

  test("results never prefetch the card", async ({ page }) => {
    const cards = cardRequests(page);
    await page.goto(RUN_PATH);
    await expect(page.getByTestId("results-record")).toHaveText("1-1-1");
    await page.waitForTimeout(3_000);
    expect(cards).toEqual([]);
  });
});

test("a coached run card renders, for the Coached chip proof capture", async ({ request }) => {
  const coached = encodeToken({
    ...decodeToken(LIVE_GOLDEN_CUP8),
    manager: [{ type: "tactic", match: 0, minute: 0, tactic: "attack" }],
  });
  const res = await request.get(`/card?t=${coached}`);
  expect([res.status(), res.headers()["content-type"]]).toEqual([200, "image/png"]);
  await writeFile(`${SHOT}/coached-card.png`, await res.body());
});
