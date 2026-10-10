// Dispatch 7, GATE 4 item 3 on phones: every interactive element is at least 44x44 CSS px, no text
// is under 11 px, the site header is one row, and inputs and selects are 44 px high. Findings
// SA-06 (button, chip and segment primitives), SA-07 (two-row header with 31.7 px links), SA-11
// (text under 11 px) and SA-12 (36 to 40 px inputs, sub-24 px controls such as Tap to skip).
//
// It walks the scene catalogue of the mobile acceptance suite at 320, 360, 390 and 430 px, plus the
// scenes that suite does not open (the phone menu, the image settings, the spinning wheel and the
// gate). Pitch and bench tokens (testid slot-*) belong to the mobile draft layout PR, so their
// sizes are recorded as an annotation and do not fail this spec.

import { expect, test as base, type Page } from "@playwright/test";
import {
  installIosButtonFocus,
  interactiveTargets,
  resizeTo,
  settle,
  undersized,
  type TargetInfo,
} from "./mobile/helpers";
import { PLAY_8_0, SCENES, blockCardRequests, ready, stubLeaderboard } from "./mobile/scenes";

const test = base.extend({
  page: async ({ page, browserName }, provide) => {
    await stubLeaderboard(page);
    await blockCardRequests(page);
    if (browserName === "webkit") await installIosButtonFocus(page);
    await provide(page);
  },
});

test.use({ reducedMotion: "reduce" });

const WIDTHS = [320, 360, 390, 430] as const;
const MIN_TEXT_PX = 11;
// One row: a 44 px control plus the header's vertical padding and border. The two-row header the
// audit measured is 126 px at 390.
const MAX_HEADER_PX = 64;

const round1 = (n: number) => String(Math.round(n * 10) / 10);
const isToken = (t: TargetInfo) => /testid=slot-/.test(t.selector);
const describeTarget = (t: TargetInfo) =>
  `${t.selector} "${t.text}" ${round1(t.width)}x${round1(t.height)}${t.inlineLink ? " [inline link]" : ""}`;

interface SmallText {
  readonly where: string;
  readonly text: string;
  readonly px: number;
}

/** Every visible element that paints its own text at a computed font size under `min` px. */
function smallText(page: Page, min: number): Promise<SmallText[]> {
  return page.evaluate((limit) => {
    const modal = document.querySelector("dialog:modal");
    const out: { where: string; text: string; px: number }[] = [];
    for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
      if (modal !== null && !modal.contains(el)) continue;
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (own === "") continue;
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest(".visually-hidden") !== null) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px >= limit - 0.01) continue;
      const testid = el.closest("[data-testid]")?.getAttribute("data-testid");
      out.push({
        where: `${el.tagName.toLowerCase()}${testid ? ` in [testid=${testid}]` : ""}`,
        text: own.slice(0, 30),
        px,
      });
    }
    return out;
  }, min);
}

interface Measured {
  readonly small: TargetInfo[];
  readonly tokens: TargetInfo[];
  readonly text: SmallText[];
  readonly header: number;
}

async function measure(page: Page): Promise<Measured> {
  const targets = await interactiveTargets(page);
  const header = await page
    .locator(".site-header")
    .evaluate((h) => h.getBoundingClientRect().height);
  return {
    small: undersized(targets.filter((t) => !isToken(t))),
    tokens: undersized(targets.filter(isToken)),
    text: await smallText(page, MIN_TEXT_PX),
    header,
  };
}

/** Measures at each phone width and fails with one literal line per problem. */
async function checkPhoneWidths(page: Page, route: string): Promise<void> {
  const problems: string[] = [];
  const tokenNotes: string[] = [];
  for (const width of WIDTHS) {
    await resizeTo(page, { width, height: 800 });
    await settle(page);
    const m = await measure(page);
    for (const t of m.small) problems.push(`${route} ${width}px target ${describeTarget(t)}`);
    for (const t of m.text)
      problems.push(`${route} ${width}px text ${t.where} "${t.text}" ${round1(t.px)}px`);
    if (m.header > MAX_HEADER_PX)
      problems.push(`${route} ${width}px header is ${round1(m.header)} px high`);
    if (m.tokens.length > 0)
      tokenNotes.push(
        `${width}px: ${m.tokens.length} tokens under 44x44, smallest ${describeTarget(
          m.tokens.reduce((a, b) => (a.width * a.height <= b.width * b.height ? a : b)),
        )}`,
      );
  }
  if (tokenNotes.length > 0)
    test.info().annotations.push({
      type: "pitch tokens (draft layout PR)",
      description: tokenNotes.join("; "),
    });
  expect(problems, problems.join("\n")).toEqual([]);
}

for (const scene of SCENES) {
  test(`phone targets: ${scene.id}`, async ({ page }) => {
    await scene.open(page);
    await checkPhoneWidths(page, scene.route);
  });
}

async function openMenu(page: Page): Promise<void> {
  await page.goto("/how-to-play");
  const menu = page.getByRole("button", { name: "Menu" });
  await ready(page, menu);
  await menu.click();
  await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
  await settle(page);
}

test("phone targets: header menu open", async ({ page }) => {
  await openMenu(page);
  await checkPhoneWidths(page, "/how-to-play menu");
});

test("phone targets: image settings open", async ({ page }) => {
  await openMenu(page);
  const images = page.locator(".image-settings summary");
  test.skip((await images.count()) === 0, "only one image pack is installed");
  await images.click();
  await expect(page.locator(".image-settings select")).toBeVisible();
  await settle(page);
  await checkPhoneWidths(page, "/how-to-play images");
});

test("phone targets: gate", async ({ page }) => {
  await page.goto("/gate?next=/");
  await expect(page.getByTestId("gate-passcode")).toBeVisible();
  await settle(page);
  await checkPhoneWidths(page, "/gate");
});

test.describe("motion on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("phone targets: spinning wheel Tap to skip", async ({ page }) => {
    await page.goto(PLAY_8_0);
    await ready(page, page.getByTestId("run-start"));
    await page.getByTestId("run-start").click();
    const wheel = page.locator('[data-testid="wheel"][data-state="spinning"]').first();
    await expect(wheel).toBeVisible();
    const skip = wheel.getByRole("button", { name: "Tap to skip" });
    const box = await skip.boundingBox();
    expect(box, "Tap to skip is on screen while the wheel spins").not.toBeNull();
    expect(box!.width, "Tap to skip width").toBeGreaterThanOrEqual(44);
    expect(box!.height, "Tap to skip height").toBeGreaterThanOrEqual(44);
  });
});
