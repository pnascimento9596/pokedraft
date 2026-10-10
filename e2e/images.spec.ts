import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { tokenImageRect } from "../src/components/share/card";
import { FORMATIONS } from "../src/engine";
import { draftSixteen, pngSize } from "./helpers";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const BLANK = { r: 128, g: 140, b: 132, a: 0.16 };

/** Every creature picture inside `scope` has loaded real pixels (no blank fallback). */
async function expectLoadedImages(page: Page, scope: string, atLeast: number) {
  const imgs = page.locator(`${scope} [data-testid="player-image"] img`);
  await expect.poll(async () => imgs.count()).toBeGreaterThanOrEqual(atLeast);
  await expect
    .poll(() =>
      imgs.evaluateAll((els) =>
        els.every(
          (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator(`${scope} [data-testid="player-image"][data-fallback]`)).toHaveCount(0);
}

test.describe("151 Challenge with images", () => {
  test.use({ reducedMotion: "no-preference" });

  test("shows creature images on the wheel, the pitch and the results", async ({ page }) => {
    await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151");
    await page.getByTestId("run-start").click();
    await expect(page.getByTestId("wheel")).toHaveAttribute("data-state", "spinning");
    await expectLoadedImages(page, '[data-testid="wheel"]', 3);
    await draftSixteen(page);
    await expectLoadedImages(page, '[data-testid="pitch"]', 11);
    await page.getByTestId("see-results").click();
    await expect(page.getByTestId("match-F")).toBeVisible();
    await expectLoadedImages(page, '[data-testid="results"]', 11);
  });
});

test.describe("exported card", () => {
  test.use({ reducedMotion: "reduce" });

  test("has no blank squares for covered ids", async ({ page }) => {
    await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151");
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await page.getByTestId("see-results").click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download image" }).click();
    const file = await download;
    expect(await pngSize(file)).toEqual({ width: 1200, height: 630 });

    const { data, info } = await sharp(await file.path())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i]!, data[i + 1]!, data[i + 2]!];
    };
    const slots = FORMATIONS["4-3-3"].slots;
    expect(slots.length).toBe(11);
    for (const slot of slots) {
      const r = tokenImageRect(slot);
      // The pitch colour beside the token, then the blank square's fill laid over that colour.
      const bg = at(r.left - 3, r.top + Math.floor(r.size / 2));
      const blank = bg.map((c, k) => c * (1 - BLANK.a) + [BLANK.r, BLANK.g, BLANK.b][k]! * BLANK.a);
      let near = 0;
      let total = 0;
      for (let y = r.top + 4; y < r.top + r.size - 4; y++) {
        for (let x = r.left + 4; x < r.left + r.size - 4; x++) {
          total++;
          const p = at(x, y);
          if (p.every((c, k) => Math.abs(c - blank[k]!) <= 4)) near++;
        }
      }
      expect(near / total, `slot ${slot.id} is a blank square`).toBeLessThan(0.05);
    }
  });
});

test.describe("image style", () => {
  test.use({ reducedMotion: "reduce" });

  test("switching the pack re-renders every picture and survives a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    const pitch = '[data-testid="pitch"]';
    await expectLoadedImages(page, pitch, 11);
    const srcs = () =>
      page
        .locator(`${pitch} [data-testid="player-image"] img`)
        .evaluateAll((els) => els.map((el) => el.getAttribute("src")));
    expect((await srcs()).every((s) => s!.startsWith("/creatures/pokeapi-pixel/"))).toBe(true);

    await page
      .getByRole("group")
      .filter({ has: page.getByLabel("Image style") })
      .getByText("Images")
      .click();
    await page.getByLabel("Image style").selectOption("pokeapi-art");
    await expect
      .poll(async () => (await srcs()).every((s) => s!.startsWith("/creatures/pokeapi-art/")))
      .toBe(true);
    await expectLoadedImages(page, pitch, 11);

    await page.reload();
    await expect(page.getByLabel("Image style")).toHaveValue("pokeapi-art");
    await page.getByRole("button", { name: "Randomize" }).click();
    await expectLoadedImages(page, pitch, 11);
    expect((await srcs()).every((s) => s!.startsWith("/creatures/pokeapi-art/"))).toBe(true);
  });

  test("a picture that fails to load shows the blank square with the same footprint", async ({
    page,
  }) => {
    await page.route("**/creatures/pokeapi-pixel/*.png", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Randomize" }).click();
    const boxes = page.locator('[data-testid="pitch"] [data-testid="player-image"]');
    await expect
      .poll(() =>
        boxes.evaluateAll(
          (els) => els.filter((e) => e.getAttribute("data-fallback") === "error").length,
        ),
      )
      .toBeGreaterThanOrEqual(11);
    const sizes = await boxes.evaluateAll((els) => els.map((e) => [e.clientWidth, e.clientHeight]));
    expect(sizes.every(([w, h]) => w === h && w > 0)).toBe(true);
  });
});
