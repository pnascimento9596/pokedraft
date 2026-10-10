import { expect, test } from "@playwright/test";
import { draftSixteen, shareAndReplay } from "./helpers";

test.use({
  reducedMotion: "reduce",
  permissions: ["clipboard-read", "clipboard-write"],
});

test("151 Challenge with a fixed seed drafts 16, shows results, and the share link replays the same record", async ({
  page,
}) => {
  await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151");
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("match-F")).toBeVisible();
  await shareAndReplay(page);
});

test("8-0 Challenge (Classic) with a fixed seed drafts 16, shows results, and the share link replays the same record", async ({
  page,
}) => {
  await page.goto(
    "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80",
  );
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("match-G1")).toBeVisible();
  await shareAndReplay(page);
});
