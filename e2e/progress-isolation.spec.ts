import { expect, test, type Page } from "@playwright/test";
import { ready } from "./mobile/scenes";

test.use({ reducedMotion: "reduce" });

const PLAY = "/play?mode=kanto151&f=4-3-3&order=squadFirst";
const SEEDED = `${PLAY}&seed=e2e-151`;
const OTHER = `${PLAY}&seed=another-player`;

async function pick(page: Page, from: number, to: number): Promise<void> {
  for (let round = from; round <= to; round++) {
    await expect(page.getByTestId("round-header")).toContainText(`Round ${round} of 16`);
    await page.locator('[data-testid^="candidate-"]').first().click();
    await page
      .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
      .first()
      .click();
  }
}

const squad = (page: Page) =>
  page
    .locator('[data-testid^="slot-"][data-filled="true"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

test("an ordinary random run keeps its first roll and progress on refresh", async ({ page }) => {
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  const candidates = page.locator('[data-testid^="candidate-"]');
  await expect(candidates.first()).toBeVisible();
  const firstRoll = await candidates.allTextContents();
  await page.reload();
  await expect(page.getByTestId("round-header")).toContainText("Round 1 of 16", {
    timeout: 10_000,
  });
  await expect(candidates).toHaveText(firstRoll);
  await pick(page, 1, 2);
  const before = await squad(page);
  await page.reload();
  await expect(page.getByTestId("round-header")).toContainText("Round 3 of 16");
  expect(await squad(page)).toEqual(before);
});

test("a browser restart restores the exact draft and results without duplicating history", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  await page.goto(SEEDED);
  await page.getByTestId("run-start").click();
  await pick(page, 1, 5);
  const state = await context.storageState();
  await page.close();
  const reopened = await browser.newContext({
    baseURL,
    storageState: state,
    reducedMotion: "reduce",
  });
  try {
    const next = await reopened.newPage();
    await next.goto(SEEDED);
    await expect(next.getByTestId("round-header")).toContainText("Round 6 of 16");
    expect(await squad(next)).toEqual([
      "GK Ninetales",
      "LB Nidorino",
      "LCB Sandshrew",
      "RCB Koffing",
      "RB Slowpoke",
    ]);
    await pick(next, 6, 16);
    await next.getByTestId("see-results").click();
    await expect(next.getByTestId("results-record")).toHaveText("3-0-2");
    await expect
      .poll(() =>
        next.evaluate(
          () => JSON.parse(localStorage.getItem("pokedraft:history:v1") ?? "[]").length,
        ),
      )
      .toBe(1);
    const finished = await reopened.storageState();
    const after = await browser.newContext({
      baseURL,
      storageState: finished,
      reducedMotion: "reduce",
    });
    try {
      const result = await after.newPage();
      await result.goto(SEEDED);
      await expect(result.getByTestId("results-record")).toHaveText("3-0-2");
      await result.reload();
      await expect(result.getByTestId("results-record")).toHaveText("3-0-2");
      expect(
        await result.evaluate(
          () => JSON.parse(localStorage.getItem("pokedraft:history:v1") ?? "[]").length,
        ),
      ).toBe(1);
    } finally {
      await after.close();
    }
  } finally {
    await reopened.close();
  }
});

test("simultaneous players keep separate progress and history while viewing a shared result", async ({
  page: alice,
  browser,
  baseURL,
}) => {
  const bobContext = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  try {
    const bob = await bobContext.newPage();
    await alice.goto(SEEDED);
    await alice.getByTestId("run-start").click();
    await pick(alice, 1, 2);
    await bob.goto(OTHER);
    await bob.getByTestId("run-start").click();
    await pick(bob, 1, 4);
    const bobSquad = await squad(bob);
    await pick(alice, 3, 16);
    await alice.getByTestId("see-results").click();
    await expect(alice.getByTestId("results-record")).toHaveText("3-0-2");
    await expect(bob.getByTestId("round-header")).toContainText("Round 5 of 16");
    expect(await squad(bob)).toEqual(bobSquad);
    const raw = await alice.evaluate(() => localStorage.getItem("pokedraft.run.kanto151"));
    const token = JSON.parse(raw!).token as string;
    const [version, payload] = token.split(".");
    await bob.goto(`/r/${version}?t=${payload}`);
    await expect(bob.getByTestId("results-record")).toHaveText("3-0-2");
    await bob.goto("/history");
    await expect(bob.getByTestId("history-empty")).toBeVisible();
    await bob.goto(OTHER);
    await expect(bob.getByTestId("round-header")).toContainText("Round 5 of 16");
    expect(await squad(bob)).toEqual(bobSquad);
    expect(await bob.evaluate(() => localStorage.getItem("pokedraft:stats:v1"))).toBeNull();
  } finally {
    await bobContext.close();
  }
});

test("two tabs keep independent runs and New run clears only its own checkpoint", async ({
  page: first,
  context,
}) => {
  await first.goto(PLAY);
  await first.getByTestId("run-start").click();
  await pick(first, 1, 2);
  const firstSquad = await squad(first);
  const second = await context.newPage();
  await second.goto(OTHER);
  await ready(second, second.getByTestId("run-start"));
  await expect(second.getByTestId("run-start")).not.toHaveAttribute("aria-busy", "true");
  await second.getByTestId("run-start").click();
  await pick(second, 1, 1);
  const secondSquad = await squad(second);
  await first.reload();
  await expect(first.getByTestId("round-header")).toContainText("Round 3 of 16");
  expect(await squad(first)).toEqual(firstSquad);
  await first.getByRole("button", { name: "New run" }).click();
  await first.reload();
  await expect(first.getByTestId("run-start")).toBeVisible();
  await second.close();
  const reopened = await context.newPage();
  await reopened.goto(OTHER);
  await expect(reopened.getByTestId("round-header")).toContainText("Round 2 of 16");
  expect(await squad(reopened)).toEqual(secondSquad);
});

test("wrong seed or settings cannot adopt a saved run and corrupt tab data falls back safely", async ({
  page,
}) => {
  await page.goto(SEEDED);
  await page.getByTestId("run-start").click();
  await pick(page, 1, 2);
  await page.goto(OTHER);
  await expect(page.getByTestId("run-start")).toBeVisible();
  await page.goto(SEEDED.replace("f=4-3-3", "f=3-5-2"));
  await expect(page.getByTestId("run-start")).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("pokedraft.run.kanto151", "invalid"));
  await page.goto(SEEDED);
  await expect(page.getByTestId("round-header")).toContainText("Round 3 of 16");
  expect(await squad(page)).toEqual(["GK Ninetales", "LB Nidorino"]);
});

test("Builder survives reopening and viewing or clearing a shared lineup protects the saved one", async ({
  page: alice,
  context,
  browser,
  baseURL,
}) => {
  await alice.goto("/");
  await alice.getByRole("button", { name: "Randomize" }).click();
  await expect(alice.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  const ownSquad = await squad(alice);
  const state = await context.storageState();
  const bobContext = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  const after = await browser.newContext({ baseURL, storageState: state, reducedMotion: "reduce" });
  try {
    const bob = await bobContext.newPage();
    await bob.goto("/");
    await expect(bob.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(0);
    await bob.getByRole("button", { name: "Randomize" }).click();
    await expect(bob.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
    const shared = bob.url();
    const restored = await after.newPage();
    await restored.goto("/");
    await expect(restored.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
    expect(await squad(restored)).toEqual(ownSquad);
    const ownCheckpoint = await restored.evaluate(() => localStorage.getItem("pokedraft.builder"));
    await restored.goto(shared);
    await expect(restored.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
    expect(await squad(restored)).toEqual(await squad(bob));
    expect(await restored.evaluate(() => localStorage.getItem("pokedraft.builder"))).toBe(
      ownCheckpoint,
    );
    await restored.getByRole("button", { name: "Clear all" }).click();
    await expect(restored.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(0);
    await restored.goto("/");
    await expect(restored.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
    expect(await squad(restored)).toEqual(ownSquad);
    await restored.getByRole("button", { name: "Clear all" }).click();
    await restored.goto("/");
    await expect(restored.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(0);
  } finally {
    await bobContext.close();
    await after.close();
  }
});
