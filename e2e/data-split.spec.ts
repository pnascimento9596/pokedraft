import { expect, test, type Page } from "@playwright/test";

// The species data (pokedex.json and scouting.json, about 1.3 MB raw) is only needed once a
// draft starts or the builder is used. A script that inlines either file carries their field
// names, so a JS response holding `"kickMoves"` (pokedex only) or `"baseline"` (scouting only)
// is the data chunk, whatever its hashed file name.
const DATA_MARKERS = ['"kickMoves"', '"baseline"'];

function watchDataChunk(page: Page): { readonly requested: () => Promise<string[]> } {
  const hits: Promise<string | null>[] = [];
  page.on("response", (res) => {
    if (res.request().resourceType() !== "script") return;
    hits.push(
      res
        .text()
        .then((body) =>
          DATA_MARKERS.some((m) => body.includes(m)) ? new URL(res.url()).pathname : null,
        )
        .catch(() => null),
    );
  });
  return {
    requested: async () => (await Promise.all(hits)).filter((u): u is string => u !== null),
  };
}

// Cold load: the page, hydration, and the header links' prefetches, which run after idle.
async function coldLoad(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
}

const PLAY = "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80";

test.use({ reducedMotion: "reduce" });

test("the builder home does not download the species data until a slot is tapped", async ({
  page,
}) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/");
  await expect(page.getByRole("heading", { name: "Build your XI" })).toBeVisible();
  expect(await data.requested()).toEqual([]);

  await page.getByTestId("slot-s0").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await data.requested()).toHaveLength(1);
});

test("the challenge start panel does not download the species data until Start", async ({
  page,
}) => {
  const data = watchDataChunk(page);
  await coldLoad(page, PLAY);
  await expect(page.getByTestId("run-start")).toBeVisible();
  expect(await data.requested()).toEqual([]);

  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  expect(await data.requested()).toHaveLength(1);
});

test("a broken challenge link does not download the species data", async ({ page }) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/play");
  await expect(
    page.getByRole("heading", { name: "That challenge link does not work" }),
  ).toBeVisible();
  expect(await data.requested()).toEqual([]);
});

test("the daily start panel does not download the species data until Start", async ({ page }) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/daily");
  await expect(page.getByTestId("daily-kicker")).toBeVisible();
  expect(await data.requested()).toEqual([]);

  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  expect(await data.requested()).toHaveLength(1);
});
