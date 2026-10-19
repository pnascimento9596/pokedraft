import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

// A player who saved Quick sim and then switched manager mode on. Manager mode plays live: the
// Quick choice is disabled with a hint, and the match is clocked at the live pace.
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-coach";
const SHOT = "docs/reports/quick-not-broadcast";

async function seedManagerQuick(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem("pokedraft:panel") === null)
      localStorage.setItem(
        "pokedraft:panel",
        JSON.stringify({ managerMode: true, matchView: "quick" }),
      );
  });
}

const savedView = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("pokedraft:panel") ?? "{}").matchView);

test("manager mode plays live over a saved Quick choice, at 390px", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedManagerQuick(page);

  await page.goto("/");
  // The builder's friendly card shows the same settings, so read the Play card's own copy.
  const desk = page.getByRole("complementary", { name: "Control desk" });
  const homeView = desk.getByRole("group", { name: "Match view" });
  await expect(homeView.getByRole("button", { name: "Quick sim" })).toBeDisabled();
  await expect(homeView.getByRole("button", { name: "Live match" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(desk.getByText("Manager mode plays live")).toBeVisible();
  await expect(desk.getByTestId("match-view-quick")).toBeDisabled();
  await homeView.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390-home-manager-plays-live.png` });

  await page.goto(PLAY);
  await expect(page.getByTestId("match-view-quick")).toBeDisabled();
  await expect(page.getByTestId("match-view-live")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("match-view-hint")).toHaveText("Manager mode plays live");
  await page.getByTestId("matchday-settings").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/390-start-manager-plays-live.png` });
  expect(await savedView(page)).toBe("quick");

  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  await page.getByTestId("prematch-go").click();
  await expect(page.getByTestId("match-player")).toHaveAttribute("data-view", "live");
  await expect(page.getByTestId("broadcast")).toHaveAttribute("data-motion", "on");

  // Live pace is 25 s a half; Quick would be past 60' after 3 s.
  await page.waitForTimeout(3_000);
  const minute = Number(await page.getByTestId("match-player").getAttribute("data-minute"));
  console.log(`minute after 3 s of a managed match: ${minute}`);
  expect(minute).toBeLessThan(10);
  await page.screenshot({ path: `${SHOT}/390-managed-match-live-pace.png` });
  expect(await savedView(page)).toBe("quick");
});
