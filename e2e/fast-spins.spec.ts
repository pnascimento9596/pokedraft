import { expect, test, type Page } from "@playwright/test";
import { openHomeSettings } from "./helpers";

const SHOT = "docs/reports/fast-spins";
const PLAY = "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=e2e-fast-spins";

declare global {
  interface Window {
    __firstReveal?: { start: number | null; settled: number | null };
  }
}

// Times the first reveal in the page, from the first spinning reel to both reels settled.
async function watchFirstReveal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const t = { start: null as number | null, settled: null as number | null };
    window.__firstReveal = t;
    new MutationObserver(() => {
      if (
        t.start === null &&
        document.querySelector('[data-testid="wheel"][data-state="spinning"]')
      )
        t.start = performance.now();
      if (t.start !== null && t.settled === null) {
        if (document.querySelectorAll('[data-testid="wheel-result"]').length === 2)
          t.settled = performance.now();
      }
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
}

async function firstRevealMs(page: Page): Promise<number> {
  await page.goto(PLAY);
  await page.getByTestId("run-start").click();
  await expect(page.getByTestId("wheel-result")).toHaveCount(2, { timeout: 10_000 });
  const t = await page.evaluate(() => window.__firstReveal!);
  expect(t.start).not.toBeNull();
  expect(t.settled).not.toBeNull();
  return t.settled! - t.start!;
}

async function chooseSpinSpeed(page: Page, label: "Normal" | "Fast"): Promise<void> {
  await page.goto("/");
  await openHomeSettings(page);
  const group = page.getByRole("group", { name: "Spin speed" });
  await group.getByRole("button", { name: label, exact: true }).click();
  await expect(group.getByRole("button", { name: label, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

test.use({ viewport: { width: 390, height: 844 } });

test("spin speed setting sits in Setup, starts Normal and keeps Fast after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await openHomeSettings(page);
  const group = page.getByRole("group", { name: "Spin speed" });
  await expect(group.getByRole("button")).toHaveText(["Normal", "Fast"]);
  await expect(group.getByRole("button", { name: "Normal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const setup = page.getByRole("heading", { name: "Setup", level: 3 }).locator("..");
  await expect(setup.getByRole("group", { name: "Spin speed" })).toBeVisible();

  await group.getByRole("button", { name: "Fast" }).click();
  await expect(group.getByRole("button", { name: "Fast" })).toHaveAttribute("aria-pressed", "true");
  await setup.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOT}/setting-390.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.reload();
  await openHomeSettings(page);
  await expect(
    page.getByRole("group", { name: "Spin speed" }).getByRole("button", { name: "Fast" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("a fast run's first reveal settles within 2 s at 390", async ({ page }) => {
  await watchFirstReveal(page);
  await chooseSpinSpeed(page, "Fast");
  const ms = await firstRevealMs(page);
  console.log(`fast first reveal ${Math.round(ms)} ms`);
  expect(ms).toBeLessThan(2_000);
});

test("a normal run's first reveal still takes at least 4 s at 390", async ({ page }) => {
  await watchFirstReveal(page);
  await chooseSpinSpeed(page, "Normal");
  const ms = await firstRevealMs(page);
  console.log(`normal first reveal ${Math.round(ms)} ms`);
  expect(ms).toBeGreaterThanOrEqual(4_000);
});
