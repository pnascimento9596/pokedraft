import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { draftSixteen } from "./helpers";

// Dispatch 7 theme 7E. Text needs 4.5:1 and UI boundaries, state rings and focus rings need 3:1
// (WCAG 1.4.3 and 1.4.11), in both themes. axe scores flat text; it cannot score text on the
// pitch grass or the results hero gradient, so those are read from rendered pixels below.

const TOKEN =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const DRAFT = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=a11y";

const ENTRY = {
  rank: 1,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  token: "pd1.e2e-one",
  teamScore: 845,
  wins: 8,
  draws: 0,
  losses: 0,
  createdAt: "2026-10-09T12:00:00.000Z",
};

const BODY_BACKGROUND = { dark: "rgb(20, 24, 15)", light: "rgb(231, 234, 226)" };

type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function over([r, g, b, a]: Rgba, bg: Rgb): Rgb {
  return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
}

// Computed colours come back as rgb()/rgba(), or as color(srgb r g b / a) after color-mix().
function parseColor(css: string): Rgba {
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(css);
  if (srgb) {
    const [, r, g, b, a] = srgb;
    return [Number(r) * 255, Number(g) * 255, Number(b) * 255, a === undefined ? 1 : Number(a)];
  }
  const rgb = /rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)/.exec(css);
  if (!rgb) throw new Error(`unparsed colour ${css}`);
  const [, r, g, b, a] = rgb;
  return [Number(r), Number(g), Number(b), a === undefined ? 1 : Number(a)];
}

// The flat colour behind an element: its ancestors' background-colors composited from the root.
async function surface(locator: Locator): Promise<Rgb> {
  const layers = await locator.evaluate((el) => {
    const out: string[] = [];
    for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
      out.push(getComputedStyle(n).backgroundColor);
    }
    return out;
  });
  let bg: Rgb = [255, 255, 255];
  for (const css of layers.reverse()) bg = over(parseColor(css), bg);
  return bg;
}

type Box = { x: number; y: number; width: number; height: number };

// Rendered pixels of a viewport box, taken while the extra CSS is applied.
async function shot(page: Page, clip: Box, css: string): Promise<Rgb[]> {
  const style = await page.addStyleTag({ content: css });
  const png = await page.screenshot({ clip, animations: "disabled" });
  await style.evaluate((el) => (el as Element).remove());
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out: Rgb[] = [];
  for (let i = 0; i < info.width * info.height * 3; i += 3) {
    out.push([data[i]!, data[i + 1]!, data[i + 2]!]);
  }
  return out;
}

// The pixels behind a text node: the box is shot with the matched text made transparent.
async function behindText(page: Page, box: Box, hide: string): Promise<Rgb[]> {
  return shot(
    page,
    box,
    `${hide} { color: transparent !important; text-shadow: none !important; }`,
  );
}

function worst(fg: Rgba, bgs: Rgb[]): number {
  return Math.min(...bgs.map((bg) => ratio(over(fg, bg), bg)));
}

async function contentBox(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const left = px(s.borderLeftWidth) + px(s.paddingLeft);
    const top = px(s.borderTopWidth) + px(s.paddingTop);
    return {
      x: r.x + left,
      y: r.y + top,
      width: r.width - left - px(s.borderRightWidth) - px(s.paddingRight),
      height: r.height - top - px(s.borderBottomWidth) - px(s.paddingBottom),
    };
  });
}

// Grass under and around a pitch token, with every token and the chalk lines hidden.
async function grassAround(page: Page, token: Locator): Promise<Rgb[]> {
  await token.scrollIntoViewIfNeeded();
  const box = await token.boundingBox();
  if (!box) throw new Error("token has no box");
  const pad = 6;
  const clip = {
    x: box.x - pad,
    y: box.y - pad,
    width: box.width + 2 * pad,
    height: box.height + 2 * pad,
  };
  return shot(
    page,
    clip,
    `[class*="_token"], [class*="_lines"], [class*="_edges"] { visibility: hidden !important; }`,
  );
}

// The outermost solid ring of a box-shadow list ("<colour> 0px 0px 0px <spread>, ...").
function outerRing(boxShadow: string): Rgba {
  const layers = boxShadow.split(/,(?![^(]*\))/).map((layer) => {
    const colour = /^\s*((?:rgba?|color)\([^)]*\))/.exec(layer)?.[1];
    const lengths = [...layer.replace(colour ?? "", "").matchAll(/(-?[\d.]+)px/g)].map((m) =>
      Number(m[1]),
    );
    return { colour, blur: lengths[2] ?? 0, spread: lengths[3] ?? 0 };
  });
  const solid = layers.filter((l) => l.colour && l.blur === 0 && l.spread > 0);
  const outer = solid.sort((a, b) => b.spread - a.spread)[0];
  if (!outer?.colour) throw new Error(`no solid ring in ${boxShadow}`);
  return parseColor(outer.colour);
}

// Transitions would let a reading land mid-fade (a focus outline starts as a 3px white ring).
async function visit(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
}

// The body paints two radial washes (at most 10 percent) over --bg, and axe gives up on any text
// above a background image, so every node on the page body would land in "incomplete". The scan
// runs on the flat --bg instead; the pitch and the hero keep their images and are measured from
// pixels in the tests below.
async function axeContrast(page: Page): Promise<string[]> {
  const flat = await page.addStyleTag({ content: "body { background-image: none !important; }" });
  const results = await new AxeBuilder({ page })
    .options({ runOnly: { type: "rule", values: ["color-contrast"] } })
    .analyze();
  await flat.evaluate((el) => (el as Element).remove());
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${n.target.join(" ")} :: ${n.any[0]?.message ?? v.id}`),
  );
}

async function openDraft(page: Page): Promise<void> {
  await visit(page, DRAFT);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  await page.locator('[data-testid^="candidate-"]').first().waitFor();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

for (const colorScheme of ["dark", "light"] as const) {
  test.describe(`${colorScheme} theme contrast`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/leaderboard?**", (route) =>
        route.fulfill({
          json: { mode: "cup8", scope: "daily", date: "2026-10-09", entries: [ENTRY] },
        }),
      );
      await page.route("**/api/leaderboard", (route) =>
        route.fulfill({ status: 201, json: { entry: { ...ENTRY, rank: 4 } } }),
      );
    });

    const flat: { name: string; open: (page: Page) => Promise<void> }[] = [
      { name: "home", open: (page) => visit(page, "/") },
      { name: "how to play", open: (page) => visit(page, "/how-to-play") },
      {
        name: "shared results",
        open: async (page) => {
          await visit(page, `/r/${TOKEN}`);
          await page.getByTestId("results-record").waitFor();
        },
      },
      {
        name: "leaderboard",
        open: async (page) => {
          await visit(page, "/leaderboard?mode=cup8&scope=daily&date=2026-10-09");
          await expect(page.getByTestId("board-row")).toHaveCount(1);
        },
      },
      {
        name: "live draft with a selected candidate",
        open: async (page) => {
          await openDraft(page);
          await page.locator('[data-testid^="candidate-"]').first().click();
        },
      },
      {
        name: "builder picker with a type filter on",
        open: async (page) => {
          await visit(page, "/");
          await page.getByRole("button", { name: "Empty LCB slot" }).click();
          const dialog = page.getByRole("dialog");
          await dialog.getByRole("button", { name: "Water", exact: true }).click();
          await expect(dialog.getByRole("button", { name: "Water", exact: true })).toHaveAttribute(
            "aria-pressed",
            "true",
          );
        },
      },
    ];

    for (const { name, open } of flat) {
      test(`axe color-contrast finds nothing on ${name}`, async ({ page }) => {
        await open(page);
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          BODY_BACKGROUND[colorScheme],
        );
        expect(await axeContrast(page)).toEqual([]);
      });
    }

    test("axe color-contrast finds nothing on daily results, the submitted rank and history", async ({
      page,
    }) => {
      await visit(page, "/daily");
      await page.getByTestId("run-start").click();
      await draftSixteen(page);
      await page.getByTestId("see-results").click();
      await expect(page.getByTestId("submit-panel")).toBeVisible();
      expect(await axeContrast(page)).toEqual([]);

      const field = page.getByTestId("submit-nickname");
      const border = parseColor(await field.evaluate((el) => getComputedStyle(el).borderTopColor));
      const fill = parseColor(await field.evaluate((el) => getComputedStyle(el).backgroundColor));
      const outside = await surface(field);
      expect(round2(ratio(over(border, over(fill, outside)), outside))).toBeGreaterThanOrEqual(3);

      await field.fill("Misty");
      await page.getByTestId("submit-button").click();
      await expect(page.getByTestId("submit-panel")).toContainText("4");
      expect(await axeContrast(page)).toEqual([]);

      await visit(page, "/history");
      await page.locator("footer").first().waitFor();
      expect(await axeContrast(page)).toEqual([]);
    });

    test("token names on the pitch reach 4.5:1 on their rendered surface", async ({ page }) => {
      await visit(page, `/r/${TOKEN}`);
      await page.getByTestId("results-record").waitFor();
      const names = page.locator('[class*="_field"] [class*="_tokenName"]');
      expect(await names.count()).toBe(11);
      const scores: number[] = [];
      for (const name of await names.all()) {
        const bg = await shot(
          page,
          await contentBox(name),
          `[class*="_tokenName"] { color: transparent !important; text-shadow: none !important; }
           [class*="_lines"], [class*="_edges"], [class*="_tokenImage"] { visibility: hidden !important; }`,
        );
        const color = await name.evaluate((element) => getComputedStyle(element).color);
        scores.push(round2(worst(parseColor(color), bg)));
      }
      expect(Math.min(...scores)).toBeGreaterThanOrEqual(4.5);
    });

    test("results header text reaches its ratio on the rendered module", async ({ page }) => {
      await visit(page, `/r/${TOKEN}`);
      await page.getByTestId("results-record").waitFor();
      const hero = page.locator('[class*="_hero"]').first();
      const parts: { selector: string; need: number }[] = [
        { selector: ".eyebrow", need: 4.5 },
        { selector: '[class*="_formation"]', need: 4.5 },
        { selector: '[class*="_recordLabel"]', need: 4.5 },
        { selector: '[data-testid="results-record"]', need: 3 },
        { selector: '[class*="_finish"]', need: 4.5 },
      ];
      const colours = await Promise.all(
        parts.map(({ selector }) =>
          hero
            .locator(selector)
            .first()
            .evaluate((n) => getComputedStyle(n).color),
        ),
      );
      const scores: Record<string, number> = {};
      for (const [i, { selector, need }] of parts.entries()) {
        const box = await contentBox(hero.locator(selector).first());
        const bg = await behindText(page, box, `[class*="_hero"] *`);
        scores[selector] = Math.min(round2(worst(parseColor(colours[i]!), bg)) / need, 1);
      }
      expect(scores).toEqual({
        ".eyebrow": 1,
        '[class*="_formation"]': 1,
        '[class*="_recordLabel"]': 1,
        '[data-testid="results-record"]': 1,
        '[class*="_finish"]': 1,
      });
    });

    test("weak-spot rings on the results pitch reach 3:1 against the grass", async ({ page }) => {
      await visit(page, `/r/${TOKEN}`);
      await page.getByTestId("results-record").waitFor();
      const weak = page.locator('[class*="_field"] [data-weak]');
      expect(await weak.count()).toBeGreaterThan(0);
      for (const token of await weak.all()) {
        const shadow = await token
          .locator('[class*="_tokenImage"]')
          .evaluate((el) => getComputedStyle(el).boxShadow);
        const grass = await grassAround(page, token.locator('[class*="_tokenImage"]'));
        expect(round2(worst(outerRing(shadow), grass))).toBeGreaterThanOrEqual(3);
      }
    });

    test("a focused pitch token shows a focus ring that reaches 3:1 on the grass", async ({
      page,
    }) => {
      await visit(page, "/");
      const slot = page.getByRole("button", { name: "Empty ST slot" });
      await page.keyboard.press("Tab");
      await slot.focus();
      const outline = await slot.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: s.outlineWidth, colour: s.outlineColor };
      });
      expect(outline.style).toBe("solid");
      expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
      const grass = await grassAround(page, slot);
      expect(round2(worst(parseColor(outline.colour), grass))).toBeGreaterThanOrEqual(3);
    });

    test("armed slots and the focused armed slot are both visible on the grass and tell apart", async ({
      page,
    }) => {
      await openDraft(page);
      await page.locator('[data-testid^="candidate-"]').first().click();
      const slots = page.locator('[data-testid^="slot-"][data-filled="false"]');
      const [first, second] = [slots.nth(0), slots.nth(1)];
      await page.keyboard.press("Tab");
      await first.focus();
      const read = (l: Locator) =>
        l.evaluate((el) => {
          const s = getComputedStyle(el);
          return { style: s.outlineStyle, colour: s.outlineColor, animation: s.animationName };
        });
      const focused = await read(first);
      const armed = await read(second);
      expect({ focused: [focused.style, focused.animation], armed: armed.style }).toEqual({
        focused: ["solid", "none"],
        armed: "dashed",
      });
      expect(
        round2(worst(parseColor(focused.colour), await grassAround(page, first))),
      ).toBeGreaterThanOrEqual(3);
      expect(
        round2(worst(parseColor(armed.colour), await grassAround(page, second))),
      ).toBeGreaterThanOrEqual(3);
    });

    test("the selected candidate ring and the wheel payline reach 3:1", async ({ page }) => {
      await openDraft(page);
      const payline = page.locator('[class*="_payline"]').first();
      const lineColour = parseColor(
        await payline.evaluate((el) => getComputedStyle(el).borderTopColor),
      );
      const windowFill = over(
        parseColor(
          await payline.evaluate((el) => getComputedStyle(el.parentElement!).backgroundColor),
        ),
        await surface(payline.locator("..")),
      );
      expect(round2(ratio(over(lineColour, windowFill), windowFill))).toBeGreaterThanOrEqual(3);

      const candidate = page.locator('[data-testid^="candidate-"]').first();
      await candidate.click();
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      const ring = outerRing(await candidate.evaluate((el) => getComputedStyle(el).boxShadow));
      expect(
        round2(ratio(over(ring, await surface(candidate)), await surface(candidate))),
      ).toBeGreaterThanOrEqual(3);
    });

    test("picker fields keep a 3:1 focus ring and a 3:1 border", async ({ page }) => {
      await visit(page, "/");
      await page.getByRole("button", { name: "Empty LCB slot" }).click();
      const dialog = page.getByRole("dialog");
      const search = dialog.locator("input").first();
      await expect(search).toBeFocused();
      const outline = await search.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: s.outlineWidth, colour: s.outlineColor };
      });
      expect(outline.style).toBe("solid");
      expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
      const outside = await surface(search);
      expect(
        round2(ratio(over(parseColor(outline.colour), outside), outside)),
      ).toBeGreaterThanOrEqual(3);

      const select = dialog.locator("select").first();
      const border = parseColor(await select.evaluate((el) => getComputedStyle(el).borderTopColor));
      const fill = parseColor(await select.evaluate((el) => getComputedStyle(el).backgroundColor));
      const around = await surface(select);
      expect(round2(ratio(over(border, over(fill, around)), around))).toBeGreaterThanOrEqual(3);
    });

    test("settings switches show a 3:1 track edge off and on", async ({ page }) => {
      await visit(page, "/");
      const toggle = page.getByRole("switch", { name: /Legendaries/ });
      const track = toggle.locator('[class*="_switchTrack"]');
      const edge = async () => {
        const border = parseColor(
          await track.evaluate((el) => getComputedStyle(el).borderTopColor),
        );
        const fill = parseColor(await track.evaluate((el) => getComputedStyle(el).backgroundColor));
        const outside = await surface(track);
        return round2(ratio(over(border, over(fill, outside)), outside));
      };
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      expect(await edge()).toBeGreaterThanOrEqual(3);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      expect(await edge()).toBeGreaterThanOrEqual(3);
    });
  });
}
