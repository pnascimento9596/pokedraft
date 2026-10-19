import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";

const SHOT = "docs/reports/one-tap-play";
const CUP8_DEFAULT = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open";
const formation = (page: Page) => page.getByLabel("Formation");
const playCard = (page: Page) => page.getByRole("region", { name: "Play" });
const settingsHeading = (page: Page) =>
  page.getByRole("heading", { name: "Settings and records", level: 2 });

async function noSideScroll(page: Page, where: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${where} page overflow`).toBeLessThanOrEqual(0);
}

test.describe("one-tap play on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("Play 8-0 goes straight to the matching /play URL with no dialog, and Start drafts", async ({
    page,
  }) => {
    await page.goto("/");
    await formation(page).selectOption("4-4-2");
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(page).toHaveURL("/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=open");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByTestId("run-start").click();
    await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  });

  test("Play from home starts a fresh run instead of restoring old completed results", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const mockResult = {
        screen: "results",
        token:
          "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwicnVuLXRlc3QiLFtbInAiLDMxNiwiczkiXV1d",
        daily: null,
      };
      localStorage.setItem("pokedraft.run.cup8", JSON.stringify(mockResult));
      sessionStorage.setItem("pokedraft.run.cup8", JSON.stringify(mockResult));
    });
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(page).toHaveURL(CUP8_DEFAULT);
    await expect(page.getByTestId("run-start")).toBeVisible();
    await expect(page.getByTestId("results-record")).toHaveCount(0);
  });

  test("a formation picked as the home page loads on a slow phone reaches /play (catches a store read redoing hydration and dropping the pick)", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== "chromium", "CPU throttling needs Chromium's CDP");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });
    await page.goto("/");
    await formation(page).selectOption("4-4-2");
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(page).toHaveURL(/[?&]f=4-4-2&/);
  });

  test("settings are open on first load with Formation, Order and the switches visible", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Hide settings and records" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(formation(page)).toBeVisible();
    for (const label of ["Generations", "Draft style", "Order"]) {
      await expect(page.getByRole("group", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Your records" })).toBeVisible();
  });

  test("the Play card holds the one home Matchday selector, and the start card summary follows it", async ({
    page,
  }) => {
    await page.goto("/");
    const card = playCard(page);
    const manager = card.getByTestId("manager-mode");
    await expect(manager).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("heading", { name: "Matchday" })).toHaveCount(0);
    await manager.click();
    await expect(manager).toHaveAttribute("aria-checked", "true");
    await expect(card.getByTestId("match-view-quick")).toBeDisabled();
    await expect(card.getByTestId("match-view-hint")).toHaveText("Manager mode plays live");

    await page.getByRole("button", { name: "Play 151 Challenge" }).click();
    await expect(page).toHaveURL("/play?mode=kanto151&f=4-3-3&order=squadFirst");
    await expect(page.locator("dl dt")).toHaveText(["Formation", "Order", "Matchday"]);
    await expect(page.locator("dl dd")).toHaveText(["4-3-3", "Squad First", "Manager, Live"]);
    await page.getByTestId("manager-mode").click();
    await expect(page.locator("dl dd").last()).toHaveText("Sim, Quick");
  });

  test("Edit lands on an open settings panel at 390", async ({ page }) => {
    await page.goto(CUP8_DEFAULT);
    const edit = page.getByRole("link", { name: "Edit settings" });
    await expect(edit).toBeVisible();
    const box = await edit.boundingBox();
    expect(box!.height, "Edit link height").toBeGreaterThanOrEqual(44);
    await edit.click();
    await expect(page).toHaveURL("/#settings");
    await expect(page.locator("#settings")).toHaveAttribute("data-open", "true");
    await expect(settingsHeading(page)).toBeFocused();
    await expect(settingsHeading(page)).toBeInViewport();
    await expect(formation(page)).toBeVisible();
  });

  test("draft complete with manager on says Kick off", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await playCard(page).getByTestId("manager-mode").click();
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await expect(page.getByTestId("see-results")).toHaveText("Kick off");
    await page.getByTestId("see-results").click();
    await expect(page.getByTestId("matchday")).toBeVisible();
  });

  test("draft complete with a quick sim still says See results", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(CUP8_DEFAULT);
    await page.getByTestId("run-start").click();
    await draftSixteen(page);
    await expect(page.getByTestId("see-results")).toHaveText("See results");
  });

  test("the Play card and the start card fit 390, 360 and 320 px", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "screenshots come from one project");
    for (const width of [390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      const card = playCard(page);
      await expect(card.getByTestId("manager-mode")).toBeVisible();
      await noSideScroll(page, `${width}px home`);
      for (const target of [
        card.getByRole("button", { name: "Play 8-0 Challenge" }),
        card.getByTestId("manager-mode"),
        card.getByTestId("match-view-live"),
      ]) {
        const b = await target.boundingBox();
        expect(b!.height, `${width}px home target`).toBeGreaterThanOrEqual(44);
      }
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOT}/${width}-play-card.png` });

      await page.goto(CUP8_DEFAULT);
      await expect(page.getByRole("link", { name: "Edit settings" })).toBeVisible();
      await noSideScroll(page, `${width}px start card`);
      await page.screenshot({ path: `${SHOT}/${width}-start-card.png` });
    }
  });
});

test.describe("one-tap play on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop viewport only");
  test.use({ viewport: { width: 1280, height: 800 } });

  test("settings are visible on first load and Play starts the run", async ({ page }) => {
    await page.goto("/");
    await expect(formation(page)).toBeVisible();
    await page.getByRole("button", { name: "Play 8-0 Challenge" }).click();
    await expect(page).toHaveURL(CUP8_DEFAULT);
    await page.getByTestId("run-start").click();
    await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  });

  test("Edit from the start card focuses the settings heading", async ({ page }) => {
    await page.goto("/play?mode=kanto151&f=4-3-3&order=squadFirst");
    await page.getByRole("link", { name: "Edit settings" }).click();
    await expect(page).toHaveURL("/#settings");
    await expect(settingsHeading(page)).toBeFocused();
  });
});
