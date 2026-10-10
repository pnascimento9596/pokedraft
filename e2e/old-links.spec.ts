import { expect, test } from "@playwright/test";

// The real engine-1 share link the dispatch 5 accessibility spec opens (observed 8-0-0, Team
// Score 845). After the engine moved on it must still replay, on its retained bundle.
const ENGINE_1_RUN =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

test("an engine-1 share link replays on its own engine and says so", async ({ page }) => {
  const res = await page.goto(`/r/${ENGINE_1_RUN}`);
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle("pokedraft run: 8-0-0, Team Score 845");
  await expect(page.getByTestId("engine-label")).toHaveText("Played on engine v1");
});
