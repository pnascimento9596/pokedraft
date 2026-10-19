import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const SHOT = "docs/reports/pitch-density-drag";
const RUN_TEST = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
const RUN_TEST_CLASSIC3 =
  "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=run-test";
const PICKS = [269, 256, 926, 858, 679, 655, 582, 824, 230, 835, 403, 292, 215, 185, 843, 688];
const SLOTS = [
  ...Array.from({ length: 11 }, (_, i) => `s${i}`),
  ...Array.from({ length: 5 }, (_, i) => `b${i}`),
];
const STARTERS = '[data-testid^="slot-s"][data-filled="true"]';
const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 568 },
];

test.use({ hasTouch: true, isMobile: true, reducedMotion: "reduce" });

async function start(page: Page, url: string): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
  });
  await page.goto(url);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
}

async function pickAt(page: Page, species: number, slot: string): Promise<void> {
  await page.getByTestId(`candidate-${species}`).tap();
  await page.getByTestId(`slot-${slot}`).tap();
}

async function fullDraft(page: Page): Promise<void> {
  await start(page, RUN_TEST);
  for (const [round, id] of PICKS.entries()) await pickAt(page, id, SLOTS[round]!);
  await expect(page.getByTestId("round-header")).toHaveText("Draft complete");
  await page.waitForFunction(() => document.fonts.status === "loaded");
}

const frames = (page: Page, n = 2) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number) =>
          left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
        step(count);
      }),
    n,
  );

// A 40px square of a full viewport capture. A full capture shows the last frame the page drew; a
// clipped capture can draw a fresh one, which hides a preview left behind on screen.
async function square(page: Page, at: { x: number; y: number }): Promise<Buffer> {
  const png = await page.screenshot();
  return sharp(png)
    .extract({ left: Math.round(at.x - 20), top: Math.round(at.y - 20), width: 40, height: 40 })
    .removeAlpha()
    .raw()
    .toBuffer();
}

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("token sprite is 48px and stays inside its token (catches the 30px sprite below 540px)", async ({
      page,
    }) => {
      await fullDraft(page);
      const tokens = page.locator(STARTERS);
      await expect(tokens).toHaveCount(11);
      const sprites = await tokens.evaluateAll((els) =>
        els.map((el) => {
          const art = el.querySelector<HTMLElement>("[data-player-image]")!;
          const a = art.getBoundingClientRect();
          const t = el.getBoundingClientRect();
          const inside =
            a.left >= t.left - 0.5 &&
            a.right <= t.right + 0.5 &&
            a.top >= t.top - 0.5 &&
            a.bottom <= t.bottom + 0.5;
          return `${getComputedStyle(art).width} ${getComputedStyle(art).height} ${inside ? "inside" : "outside"}`;
        }),
      );
      expect(sprites).toEqual(Array.from({ length: 11 }, () => "48px 48px inside"));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByTestId("pitch").screenshot({ path: `${SHOT}/pitch-${size.width}.png` });
    });

    test("token name is one line with an ellipsis (catches names wrapped over two lines)", async ({
      page,
    }) => {
      await fullDraft(page);
      const names = await page
        .locator('[data-testid^="slot-"][data-filled="true"] [id$="-name"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
            const cs = getComputedStyle(el);
            return `${lines} ${cs.whiteSpace} ${cs.textOverflow}`;
          }),
        );
      expect(names).toEqual(Array.from({ length: 16 }, () => "1 nowrap ellipsis"));
    });

    test("the type colour is a 3px top bar and the type icon column is gone, with the types still named", async ({
      page,
    }) => {
      await fullDraft(page);
      const gk = page.getByTestId("slot-s0");
      const frame = await gk.evaluate((el) => {
        const cs = getComputedStyle(el);
        // offsetWidth, not the client rect: the tilted field's perspective scales the 1px box.
        const types = el.querySelector<HTMLElement>('[id$="-types"]')!.offsetWidth;
        return `${cs.borderTopWidth} ${cs.borderLeftWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${types <= 1 ? "hidden" : "shown"}`;
      });
      expect(frame).toBe("3px 0px 0px 0px hidden");
      await expect(gk).toHaveAccessibleName(
        /GK .+ (Normal|Fire|Water|Grass|Electric|Ice|Fighting|Poison|Ground|Flying|Psychic|Bug|Rock|Ghost|Dragon|Dark|Steel|Fairy)/,
      );
    });
  });
}

test.describe("at 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("drag preview is drawn under the pointer and the drop lands in the hovered slot (catches the preview left behind at the drag start)", async ({
    page,
  }) => {
    await start(page, RUN_TEST_CLASSIC3);
    await pickAt(page, 316, "s9");
    const card = page.getByTestId("candidate-296");
    const slot = page.getByTestId("slot-s0");
    await slot.evaluate((el) => el.scrollIntoView({ block: "end", behavior: "instant" }));
    const from = (await card.boundingBox())!;
    const to = (await slot.boundingBox())!;
    const pointer = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 30, { steps: 3 });
    await page.mouse.move(pointer.x, pointer.y, { steps: 5 });

    // Read paint before anything in the test asks for a frame: the square at the pointer with the
    // preview shown, then hidden.
    const drawn = await square(page, pointer);
    const preview = page.getByTestId("drag-preview").or(page.locator('[class*="dragPreview"]'));
    await preview.evaluate((el) => (el.style.visibility = "hidden"));
    await frames(page);
    const hidden = await square(page, pointer);
    let changed = 0;
    for (let i = 0; i < drawn.length; i += 3) {
      const diff =
        Math.abs(drawn[i]! - hidden[i]!) +
        Math.abs(drawn[i + 1]! - hidden[i + 1]!) +
        Math.abs(drawn[i + 2]! - hidden[i + 2]!);
      if (diff > 30) changed++;
    }
    const share = Math.round((changed / (drawn.length / 3)) * 100) / 100;
    expect(share, "share of the square at the pointer that the preview paints").toBeGreaterThan(
      0.2,
    );

    const box = (await preview.boundingBox())!;
    expect({
      dx: Math.round(Math.abs(box.x + box.width / 2 - pointer.x)),
      dy: Math.round(Math.abs(box.y + box.height / 2 - pointer.y)),
    }).toEqual({ dx: 0, dy: 0 });
    await preview.evaluate((el) => (el.style.visibility = ""));

    await page.mouse.up();
    await expect(page.getByTestId("slot-s0")).toContainText("Makuhita");
  });

  test("a pitch drag swaps the two players and the dragged token follows the pointer", async ({
    page,
  }) => {
    await start(page, RUN_TEST_CLASSIC3);
    await pickAt(page, 316, "s9");
    await pickAt(page, 296, "s0");
    await page.getByTestId("draft-drawer").getByRole("button", { name: "Hide players" }).click();
    const gk = page.getByTestId("slot-s0");
    const st = page.getByTestId("slot-s9");
    await gk.evaluate((el) => el.scrollIntoView({ block: "end", behavior: "instant" }));
    const from = (await gk.boundingBox())!;
    const to = (await st.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await frames(page);
    await expect(gk).toHaveAttribute("data-dragging");
    await expect(st).toHaveAttribute("data-drop", "true");
    await page.mouse.up();
    await expect(page.getByTestId("slot-s0")).toContainText("Gulpin");
    await expect(page.getByTestId("slot-s9")).toContainText("Makuhita");
  });
});
