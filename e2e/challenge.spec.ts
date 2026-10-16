import { expect, test } from "@playwright/test";
import { draftSixteen, shareAndReplay } from "./helpers";
import { RUN_151, RUN_8_0 } from "./pins";

test.use({
  reducedMotion: "reduce",
  permissions: ["clipboard-read", "clipboard-write"],
});

test("151 Challenge with a fixed seed drafts 16, shows results, and the share link replays the same record", async ({
  page,
}) => {
  await page.goto(RUN_151.url);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("match-F")).toBeVisible();
  await shareAndReplay(page, RUN_151.record);
});

test("8-0 Challenge (Classic) with a fixed seed drafts 16, shows results, and the share link replays the same record", async ({
  page,
}) => {
  await page.goto(RUN_8_0.url);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await expect(page.getByTestId("match-G1")).toBeVisible();
  await shareAndReplay(page, RUN_8_0.record);
});
