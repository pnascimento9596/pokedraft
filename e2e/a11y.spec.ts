import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// A real share token, so the shared-run page renders the full results view.
const TOKEN = "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const ROUTES = [
  "/",
  "/play?mode=builder&formation=4-3-3&gens=1",
  "/how-to-play",
  "/history",
  `/r/${TOKEN}`,
  "/r/garbage-not-a-token",
  "/nope-404",
];

for (const route of ROUTES) {
  test(`no axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.locator("footer").first().waitFor();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze();
    expect(violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`)).toEqual([]);
  });
}
