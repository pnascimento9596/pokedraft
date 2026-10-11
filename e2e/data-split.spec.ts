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

// Cold load: the page, hydration, the idle prefetch and the header links' prefetches.
async function coldLoad(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
}

// The data chunks whose request started before the window load event ended. The page may fetch
// the data once it is idle after load (so the first Start does not wait), never during load.
async function requestedBeforeLoad(page: Page, paths: readonly string[]): Promise<string[]> {
  return page.evaluate((ps) => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return ps.filter((p) => {
      const entry = performance.getEntriesByName(new URL(p, location.href).href)[0];
      return entry === undefined || nav.loadEventEnd === 0 || entry.startTime < nav.loadEventEnd;
    });
  }, paths);
}

const PLAY = "/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80";

test.use({ reducedMotion: "reduce" });

test("the builder home does not download the species data during load, and the picker gets it", async ({
  page,
}) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/");
  await expect(page.getByRole("heading", { name: "Build your XI" })).toBeVisible();
  expect(await requestedBeforeLoad(page, await data.requested())).toEqual([]);

  await page.getByTestId("slot-s0").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await data.requested()).toHaveLength(1);
});

test("the challenge start panel does not download the species data during load, and Start gets it", async ({
  page,
}) => {
  const data = watchDataChunk(page);
  await coldLoad(page, PLAY);
  await expect(page.getByTestId("run-start")).toBeVisible();
  expect(await requestedBeforeLoad(page, await data.requested())).toEqual([]);

  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  expect(await data.requested()).toHaveLength(1);
});

test("a broken challenge link does not download the species data during load", async ({ page }) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/play");
  await expect(
    page.getByRole("heading", { name: "That challenge link does not work" }),
  ).toBeVisible();
  expect(await requestedBeforeLoad(page, await data.requested())).toEqual([]);
});

test("the daily start panel does not download the species data during load, and Start gets it", async ({
  page,
}) => {
  const data = watchDataChunk(page);
  await coldLoad(page, "/daily");
  await expect(page.getByTestId("daily-kicker")).toBeVisible();
  expect(await requestedBeforeLoad(page, await data.requested())).toEqual([]);

  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
  expect(await data.requested()).toHaveLength(1);
});

// Holds every data chunk response for 3 s and reports when the first one is asked for. The idle
// prefetch asks for it from a React effect, so by then the page has hydrated.
async function slowData(page: Page): Promise<Promise<void>> {
  let asked: () => void = () => {};
  const askedFor = new Promise<void>((r) => (asked = r));
  await page.route("**/_next/static/chunks/**", async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (DATA_MARKERS.some((m) => body.includes(m))) {
      asked();
      await new Promise((r) => setTimeout(r, 3000));
    }
    await route.fulfill({ response: res, body });
  });
  return askedFor;
}

test("on a slow connection Start says it is loading, then opens the draft", async ({ page }) => {
  const askedFor = await slowData(page);
  await page.goto(PLAY);
  await askedFor;
  const start = page.getByTestId("run-start");
  await start.click();
  await expect(start).toHaveText("Loading the draft");
  await expect(start).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16");
});

test("on a slow connection the first slot tap says the players are loading, then opens the picker", async ({
  page,
}) => {
  const askedFor = await slowData(page);
  await page.goto("/");
  await askedFor;
  await page.getByTestId("slot-s0").click();
  await expect(page.getByRole("status")).toHaveText("Loading the players");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
});
