import { expect, test } from "@playwright/test";
import { draftSixteen } from "../e2e/helpers";

test.use({ reducedMotion: "reduce" });

const DISCLAIMER = "Fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company.";

test("headers: every response is noindex, robots.txt disallows everything", async ({ request }) => {
  for (const path of ["/", "/api/leaderboard?mode=cup8&scope=all", "/robots.txt"]) {
    const res = await request.get(path);
    expect(res.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});

test("a garbage share link answers 404 with the friendly page", async ({ page }) => {
  const res = await page.goto("/r/garbage-not-a-token");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("run-error")).toContainText("Run not found");
});

test("daily run: submit as verify-bot, see the row, replay it, fetch its card", async ({
  page,
  request,
}) => {
  await page.goto("/daily");
  await expect(page.locator("footer")).toContainText(DISCLAIMER);
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("see-results").click();
  const record = (await page.getByTestId("results-record").textContent())!;

  await page.getByTestId("submit-nickname").fill("verify-bot");
  await page.getByTestId("submit-button").click();
  await expect(page.getByTestId("submit-success")).toContainText(
    "verify-bot is on the daily board",
  );
  const boardHref = (await page
    .getByRole("link", { name: "View leaderboard" })
    .getAttribute("href"))!;
  const date = new URL(boardHref, "http://x").searchParams.get("date");
  console.log(`[live] verify-bot daily date ${date}, record ${record}`);

  await page.goto(boardHref);
  const row = page.getByTestId("board-row").filter({ hasText: "verify-bot" });
  await expect(row).toHaveCount(1);
  const shareHref = (await row.getByRole("link").getAttribute("href"))!;

  const shared = await page.goto(shareHref);
  expect(shared?.status()).toBe(200);
  await expect(page.getByTestId("results-record")).toHaveText(record);

  const og = await request.get(`${shareHref}/opengraph-image`);
  expect([og.status(), og.headers()["content-type"]]).toEqual([200, "image/png"]);
  const card = await request.get(`/card?t=${encodeURIComponent(shareHref.replace("/r/", ""))}`);
  expect([card.status(), card.headers()["content-type"]]).toEqual([200, "image/png"]);
});

test("footer disclaimer is on every route", async ({ page }) => {
  for (const path of ["/", "/daily", "/leaderboard", "/history", "/how-to-play"]) {
    await page.goto(path);
    await expect(page.locator("footer"), path).toContainText(DISCLAIMER);
  }
});
