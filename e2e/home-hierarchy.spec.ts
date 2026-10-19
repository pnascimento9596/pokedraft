import { expect, test, type Page } from "@playwright/test";

const SHOT = "docs/reports/home-hierarchy";
const H1 = "Draft a Pokémon XI and win the cup.";
const toggle = (page: Page) => page.getByRole("button", { name: /settings and records/i });
const settings = (page: Page) => page.locator("#settings");

// Hydration errors only reach the console, so every test here fails on one.
function watchHydration(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /hydrat/i.test(msg.text())) errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    if (/hydrat/i.test(err.message)) errors.push(err.message);
  });
  return () => errors;
}

async function cardLefts(page: Page): Promise<number[]> {
  return page
    .locator("[data-card]")
    .evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().left)));
}

test.use({ reducedMotion: "reduce" });

test("home heading order is h1 then h2s in the served page", async ({ page }) => {
  const hydration = watchHydration(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(H1);
  const order = await page
    .locator("main")
    .locator("h1, h2, h3")
    .evaluateAll((hs) => hs.map((h) => `${h.tagName} ${h.textContent}`));
  expect(order).toEqual([
    `H1 ${H1}`,
    "H2 8-0 Challenge",
    "H2 151 Challenge",
    "H2 Daily",
    "H2 Settings and records",
    "H3 Setup",
    "H3 Rules",
    "H3 Your records",
    "H2 Friendly builder",
  ]);
  expect(hydration()).toEqual([]);
});

test("settings collapsed at 390, open at 1280", async ({ page }) => {
  const hydration = watchHydration(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(settings(page)).toBeHidden();
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Formation")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(settings(page)).toBeVisible();
  await expect(page.getByLabel("Formation")).toBeVisible();
  await expect(toggle(page)).toBeHidden();
  expect(hydration()).toEqual([]);
});

test("one control for the settings region", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('[aria-controls="settings"]')).toHaveText(["Settings and records"]);
  await expect(page.getByText("Challenge Hub")).toHaveCount(0);
});

test("Daily card date equals /daily's date", async ({ page }) => {
  const hydration = watchHydration(page);
  // 03:30 UTC on 20 October is still 19 October in New York, where the daily date turns over.
  await page.clock.setFixedTime(new Date("2026-10-20T03:30:00Z"));
  await page.goto("/");
  const daily = page
    .locator("[data-card]")
    .filter({ has: page.getByRole("heading", { name: "Daily" }) });
  await expect(daily.locator("time")).toHaveText("Monday, October 19, 2026");
  await expect(daily.locator("time")).toHaveAttribute("datetime", "2026-10-19");
  await daily.getByRole("link", { name: "Play Daily" }).click();
  await expect(page).toHaveURL("/daily");
  await expect(page.getByTestId("daily-kicker").locator(".eyebrow")).toHaveText(
    "Daily challenge, Monday, October 19, 2026",
  );
  expect(hydration()).toEqual([]);
});

test("CTAs one column at 360, two at 390", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto("/");
  const at360 = await cardLefts(page);
  expect(at360).toHaveLength(3);
  expect(new Set(at360).size, `card lefts at 360: ${at360.join(", ")}`).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  // Layout widths lag the resize by a frame, and the cards switch on their own width.
  await expect
    .poll(async () => new Set((await cardLefts(page)).slice(0, 2)).size, {
      message: "challenge card lefts at 390",
    })
    .toBe(2);
});

test("home fits 390, 360, 320 and 1280 with no side scroll", async ({ page }) => {
  const hydration = watchHydration(page);
  await page.clock.setFixedTime(new Date("2026-10-19T16:00:00Z"));
  for (const [width, height] of [
    [390, 844],
    [360, 844],
    [320, 844],
    [1280, 800],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(H1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px page overflow`).toBeLessThanOrEqual(0);
    for (const name of ["Play 8-0 Challenge", "Play 151 Challenge"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      expect(b!.height, `${width}px ${name} height`).toBeGreaterThanOrEqual(44);
    }
    const daily = await page.getByRole("link", { name: "Play Daily" }).boundingBox();
    expect(daily!.height, `${width}px Play Daily height`).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${SHOT}/${width}-home.png`, fullPage: true });
  }
  expect(hydration()).toEqual([]);
});
