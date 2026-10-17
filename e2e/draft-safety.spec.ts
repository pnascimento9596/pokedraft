import { expect, test, type Page } from "@playwright/test";
import { centre, settle, settledScrollY, touchDrag, touchScroll } from "./mobile/helpers";
import { RUN_151, RUN_POSITION_FIRST } from "./pins";

test.use({ reducedMotion: "reduce" });

const filled = (page: Page) => page.locator('[data-testid^="slot-"][data-filled="true"]');

test("one tap on New run mid-draft keeps the round header (catches New run discarding a draft in one tap)", async ({
  page,
}) => {
  await page.goto(RUN_151.url);
  await page.getByTestId("run-start").click();
  const header = page.getByTestId("round-header");
  await expect(header).toHaveText("Round 1 of 16");
  await page.locator('[data-testid^="candidate-"]').first().click();
  await page.locator('[data-testid^="slot-"][data-filled="false"]').first().click();
  await expect(header).toHaveText("Round 2 of 16");

  await page.getByTestId("new-run").click();
  await expect(header).toHaveText("Round 2 of 16");
  await expect(page.getByTestId("run-start")).toHaveCount(0);
  await expect(page.getByTestId("new-run-cancel")).toBeFocused();

  await page.getByTestId("new-run-cancel").click();
  await expect(header).toHaveText("Round 2 of 16");
  await expect(filled(page)).toHaveCount(1);

  await page.getByTestId("new-run").click();
  await page.getByTestId("new-run-confirm").click();
  await expect(page.getByTestId("run-start")).toBeVisible();
});

test('"2" with the scouting dossier open signs nothing (catches draft keys reaching through the modal)', async ({
  page,
}) => {
  await page.goto(RUN_POSITION_FIRST.url);
  await page.getByTestId("run-start").click();
  const header = page.getByTestId("round-header");
  await expect(header).toHaveText("Round 1 of 16");
  await page.locator('[data-testid^="slot-"][data-filled="false"]').first().click();
  await page.locator('[data-testid^="candidate-"]').first().click();
  await expect(header).toHaveText("Round 2 of 16");
  await page.locator('[data-testid^="slot-"][data-filled="false"]').first().click();
  await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();

  await page.getByRole("button", { name: "Minimize draft picker" }).click();
  await page.getByText("Scout squad (1)").click();
  await page.getByRole("button", { name: /^Scout .+ at / }).click();
  const dossier = page.getByTestId("scouting-dossier");
  await expect(dossier).toBeVisible();

  await page.keyboard.press("2");
  await expect(dossier).toBeVisible();
  await expect(header).toHaveText("Round 2 of 16");
  await expect(filled(page)).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dossier).toHaveCount(0);
  await page.keyboard.press("2");
  await expect(header).toHaveText("Round 3 of 16");
  await expect(filled(page)).toHaveCount(2);
});

test("the home side panel stays stuck at top 16 after a 1000px scroll (catches overflow-x hidden on html and body breaking sticky)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const aside = page.getByRole("complementary", { name: "Control desk" });
  await expect(aside).toBeVisible();
  const at = await page.evaluate(() => {
    window.scrollTo(0, 1000);
    return {
      scrollY: window.scrollY,
      top: document.querySelector('aside[aria-label="Control desk"]')!.getBoundingClientRect().top,
    };
  });
  expect(at).toEqual({ scrollY: 1000, top: 16 });
});

test.describe("on a 390x844 touch screen", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  async function openPicker(page: Page) {
    await page.goto(RUN_151.url);
    await page.getByTestId("run-start").click();
    await expect(page.getByRole("button", { name: "Minimize draft picker" })).toBeVisible();
    await settle(page);
  }

  test("a tap on the dimmed pitch around the open picker closes it and places nothing (catches a backdrop that lets taps through)", async ({
    page,
  }) => {
    await openPicker(page);
    const drawer = (await page.getByTestId("draft-drawer").boundingBox())!;
    const below = { x: 195, y: Math.min(drawer.y + drawer.height + 20, 830) };
    await page.touchscreen.tap(below.x, below.y);
    await expect(page.getByRole("button", { name: "Choose a player" })).toBeVisible();
    await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
    await expect(filled(page)).toHaveCount(0);
  });

  test("a swipe down on the open picker's top bar closes it (catches a sheet with no swipe to close)", async ({
    page,
  }) => {
    await openPicker(page);
    const bar = page.getByRole("button", { name: "Minimize draft picker" });
    const from = centre((await bar.boundingBox())!);
    await touchDrag(page, from, { x: from.x, y: from.y + 160 });
    await expect(page.getByRole("button", { name: "Choose a player" })).toBeVisible();
  });

  test("a vertical swipe that starts on a player card scrolls the page (catches touch-action none trapping the scroll)", async ({
    page,
  }) => {
    await openPicker(page);
    await page.locator('[data-testid^="candidate-"]').first().click();
    const card = page.getByTestId("slot-s5");
    await card.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await settle(page);
    const start = await page.evaluate(() => window.scrollY);
    await touchScroll(page, centre((await card.boundingBox())!), 160);
    const moved = (await settledScrollY(page)) - start;
    expect(moved).toBeGreaterThan(100);
  });
});
