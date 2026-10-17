import { expect, test } from "@playwright/test";
import fixture from "../scripts/audit/fixtures.json";
import pokedex from "../src/data/pokedex.json";

const PRIMARY = new Map(pokedex.map((p) => [p.name, p.types[0]!]));

test.use({ viewport: { width: 390, height: 844 } });

test("results highlights show each star's own type and no activated ability at 390px", async ({
  page,
}) => {
  await page.goto(`/r/${fixture.shareRun.token}`);
  const highlights = page.getByTestId("match-highlights");
  await highlights.scrollIntoViewIfNeeded();

  const chips = highlights.locator('[data-testid^="highlight-chip-"]');
  const count = await chips.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i++) {
    await chips.nth(i).click();
    const name = (await page.getByTestId("star-name").textContent())!.trim();
    const icon = page.getByTestId("highlights-stage").locator("[title]").first();
    const type = PRIMARY.get(name)!;
    await expect(icon).toHaveAttribute("title", type.charAt(0).toUpperCase() + type.slice(1));
    await expect(page.getByTestId("star-ability")).not.toContainText("Activated");
  }

  await expect(page.getByRole("button", { name: "Pause Motion" })).toBeVisible();
  const drag = page.getByTestId("score-breakdown").getByText("Weak-spot drag").locator("+ *");
  await expect(drag).not.toHaveText("-0");

  await chips.first().click();
  await highlights.screenshot({ path: "output/playwright/highlights-honesty/highlights-390.png" });
  await chips.last().click();
  await highlights.screenshot({ path: "output/playwright/highlights-honesty/highlights-mvp-390.png" });
});
