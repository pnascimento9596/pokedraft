import { expect, test, type Page } from "@playwright/test";
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
