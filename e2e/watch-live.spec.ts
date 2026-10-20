import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";
import { LIVE_GOLDEN_CUP8 } from "./pins";

// The engine-5 golden cup8 run, and the same draft under the live prefix.
const RETAINED = GOLDEN_CUP8_V5;
const LIVE = LIVE_GOLDEN_CUP8;

test.use({ reducedMotion: "reduce" });

for (const width of [360, 1280]) {
  test(`Watch live replays a retained pd5 match as a goals-only broadcast at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/r/${RETAINED}`);
    await expect(page.getByTestId("results-record")).toBeVisible();
    await page.getByTestId("match-G1").getByTestId("watch-live").click();

    const replay = page.getByTestId("match-replay");
    await expect(replay.getByTestId("broadcast")).toHaveAttribute("data-goals-only", "true");
    await expect(replay).toContainText(
      "This run was recorded before match events. Only goals are shown.",
    );
    await replay.getByTestId("skip-ft").click();
    await expect(replay.getByTestId("match-player")).toHaveAttribute("data-stage", "done");
    await expect(replay.getByTestId("ticker")).toContainText(/Full time|End of extra time/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    await replay.getByTestId("match-replay-close").click();
    await expect(replay).toHaveCount(0);
  });
}

test("Watch live on a live-engine run plays the full broadcast with match events", async ({
  page,
}) => {
  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-G2").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();
  await expect(replay.getByTestId("broadcast")).not.toHaveAttribute("data-goals-only", "true");
  await expect(replay.getByTestId("match-replay-title")).toContainText("Group match 2");
  await replay.getByTestId("skip-ft").click();
  await expect(replay.getByTestId("ticker")).toContainText("Kick off");
});
