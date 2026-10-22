import { expect, test } from "@playwright/test";
import sharp from "sharp";
import {
  A11Y_RUN_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_CUP8_V6,
  GOLDEN_CUP8_V7,
} from "../src/engine/versions/__tests__/fixtures";
import { pngSize } from "./helpers";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("a garbage share link keeps the friendly page but answers HTTP 404", async ({ page }) => {
  const res = await page.goto("/r/garbage-not-a-token");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("run-error")).toContainText("Run not found");
  await expect(page.getByRole("link", { name: "Play a new run" })).toBeVisible();
});

const CURRENT_RUN =
  "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwiMDE0OGVhNzFlMWFjNTFlMyIsW1sicCIsNzQ5LCJzMCJdLFsicCIsNjMsInMxIl0sWyJwIiw5NDQsInMyIl0sWyJwIiwyNywiczMiXSxbInAiLDgyMSwiczQiXSxbInAiLDY1NiwiczUiXSxbInAiLDIwMCwiczYiXSxbInAiLDUyNCwiczciXSxbInAiLDI2OSwiczgiXSxbInAiLDQzMywiczkiXSxbInAiLDU0MywiczEwIl0sWyJwIiw5NDgsImIwIl0sWyJwIiw1MjksImIxIl0sWyJwIiw4MzQsImIyIl0sWyJwIiwzOTMsImIzIl0sWyJwIiwyNSwiYjQiXV1d";
const QUERY_PATH = `/r/pd3?t=${CURRENT_RUN.slice(4)}`;

test("a query link restores results, title, canonical OG image, card download and Share clipboard", async ({
  page,
}) => {
  const res = await page.goto(QUERY_PATH);
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp("/r/pd3\\?t="));
  await expect(page.getByTestId("results-record")).toHaveText("1-1-1");
  await expect(page.getByTestId("results-score")).toHaveText("283");
  await expect(page).toHaveTitle("pokedraft run: 1-1-1, Team Score 283");

  const ogImage = page.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveAttribute(
    "content",
    new RegExp(`/r/${CURRENT_RUN.replace(".", "\\.")}/opengraph-image`),
  );
  const imageUrl = new URL((await ogImage.getAttribute("content"))!);
  const image = await page.request.get(`${imageUrl.pathname}${imageUrl.search}`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const metadata = await sharp(await image.body()).metadata();
  expect([metadata.width, metadata.height]).toEqual([1200, 630]);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  expect(await pngSize(await download)).toEqual({ width: 1200, height: 630 });

  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Link copied", { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${new URL(page.url()).origin}${QUERY_PATH}`);
  expect((await page.goto(copied))?.status()).toBe(200);
  await expect(page.getByTestId("results-record")).toHaveText("1-1-1");
  await expect(page.getByTestId("results-score")).toHaveText("283");
});

for (const [token, record, score, version] of [
  [A11Y_RUN_V1, "8-0-0", "845", "v1"],
  [GOLDEN_CUP8_V2, "3-0-2", "593", "v2"],
  [GOLDEN_CUP8_V6, "5-0-1", "593", "v6"],
  [GOLDEN_CUP8_V7, "5-0-1", "593", "v7"],
]) {
  test(`a retained ${version} dot link still replays its original results`, async ({ page }) => {
    expect((await page.goto(`/r/${token}`))?.status()).toBe(200);
    await expect(page.getByTestId("results-record")).toHaveText(record!);
    await expect(page.getByTestId("results-score")).toHaveText(score!);
    await expect(page.getByTestId("engine-label")).toHaveText(`Played on engine ${version}`);
  });
}

for (const path of [
  "/r/pd1",
  "/r/pd1?t=e30",
  "/r/pd1.e30",
  "/r/pd2",
  "/r/pd2?t=e30",
  "/r/pd2.e30",
  "/r/pd3",
  "/r/pd3?t=e30",
  "/r/pd3.e30",
  "/r/pd4",
  "/r/pd4?t=e30",
  "/r/pd4.e30",
]) {
  test(`a malformed current or retained share link ${path} answers HTTP 404`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(page.getByTestId("run-error")).toContainText("Run not found");
  });
}
