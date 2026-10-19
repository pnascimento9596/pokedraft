// Theme 7F on a desktop browser with a keyboard: a swap without a drag (SB-26, SC-10), focus after
// screen changes (SC-11) and the Picker (SC-12), the page's one live region (SC-13, SC-14), and the
// reroll buttons' names (axe label-content-name-mismatch). Touch swaps and the pitch swipe are in
// group 5 of e2e/mobile-acceptance.spec.ts.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { draftSixteen } from "./helpers";
import { PLAY_8_0, ready, stubLeaderboard } from "./mobile/scenes";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await stubLeaderboard(page);
});

async function start(page: Page): Promise<void> {
  await page.goto(PLAY_8_0);
  const go = page.getByTestId("run-start");
  await ready(page, go);
  await go.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("round-header")).toHaveText("Round 1 of 16");
}

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el === null || el === document.body ? "body" : `${el.tagName}: ${el.textContent}`;
  });

const species = async (page: Page, key: string) =>
  ((await page.getByTestId(`slot-${key}`).getAttribute("aria-label")) ?? "").replace(/^\S+ /, "");

test("with the keyboard alone, Enter on one player and Space on another swaps them after the draft", async ({
  page,
}) => {
  await start(page);
  await draftSixteen(page);
  const before = [await species(page, "s0"), await species(page, "s9")];
  await page.getByTestId("slot-s0").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("slot-s0")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("slot-s9").focus();
  await page.keyboard.press(" ");
  await expect
    .poll(async () => [await species(page, "s0"), await species(page, "s9")])
    .toEqual([before[1], before[0]]);
  await expect(page.getByTestId("slot-s0")).toHaveAttribute("aria-pressed", "false");
});

test("Escape cancels a swap picked with the keyboard", async ({ page }) => {
  await start(page);
  await draftSixteen(page);
  const before = [await species(page, "s1"), await species(page, "s2")];
  await page.getByTestId("slot-s1").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("slot-s1")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("slot-s1")).toHaveAttribute("aria-pressed", "false");
  expect([await species(page, "s1"), await species(page, "s2")]).toEqual(before);
});

test("Start run, See results and New run each move focus to the new screen's heading", async ({
  page,
}) => {
  await start(page);
  const afterStart = await focused(page);
  await draftSixteen(page);
  await page.getByTestId("see-results").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("results")).toBeVisible();
  const afterResults = await focused(page);
  await page.getByRole("button", { name: "New run" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("run-start")).toBeVisible();
  await expect(page).not.toHaveURL(/(?:\?|&)seed=/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  expect({ afterStart, afterResults, afterNewRun: await focused(page) }).toEqual({
    afterStart: "H1: Round 1 of 16",
    afterResults: "H1: 8-0 Challenge, Classic",
    afterNewRun: "H1: 8-0 Challenge",
  });
});

test("the page's live region is there, empty, before Start, and the draft speaks through that same node", async ({
  page,
}) => {
  await page.goto(PLAY_8_0);
  await ready(page, page.getByTestId("run-start"));
  const region = page.getByTestId("announcer");
  await expect(region).toHaveCount(1);
  expect(
    await region.evaluate((el) => {
      (el as HTMLElement & { tagged?: boolean }).tagged = true;
      return { role: el.getAttribute("role"), text: el.textContent };
    }),
  ).toEqual({ role: "status", text: "" });
  await page.getByTestId("run-start").click();
  await expect(region).not.toHaveText("");
  expect(await region.evaluate((el) => (el as HTMLElement & { tagged?: boolean }).tagged)).toBe(
    true,
  );
});

test("no live region is added with its text already in it during a draft, its results and a share", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(PLAY_8_0);
  await ready(page, page.getByTestId("run-start"));
  await page.evaluate(() => {
    const added: string[] = [];
    (window as unknown as { liveAdded: string[] }).liveAdded = added;
    const live = '[role="status"], [aria-live]:not([aria-live="off"])';
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof Element)) continue;
          for (const el of [n, ...n.querySelectorAll(live)])
            // The callback runs at the end of the task that added the node, so text seen here
            // arrived together with the region, and a screen reader may never hear it.
            if (el.matches(live) && el.closest("dialog") === null && el.textContent !== "")
              added.push(el.outerHTML);
        }
    }).observe(document.body, { subtree: true, childList: true });
  });
  await page.getByTestId("run-start").click();
  await draftSixteen(page);
  await page.getByTestId("slot-s0").click();
  await page.getByTestId("slot-s9").click();
  await page.getByTestId("see-results").click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { liveAdded: string[] }).liveAdded),
  ).toEqual([]);
});

test("the reroll buttons' names hold their visible text (axe label-content-name-mismatch)", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator('[data-testid^="candidate-"]').first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withRules(["label-content-name-mismatch"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`)).toEqual([]);
});

test("the Picker gives focus back to the slot after a pick and after Clear slot (SC-12)", async ({
  page,
}) => {
  await page.goto("/");
  const slot = page.getByTestId("slot-s6");
  await ready(page, slot);
  await slot.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("pikachu");
  await dialog.getByTestId("pick-25").focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  const afterPick = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));

  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Clear slot" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  const slotName = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  expect({ afterPick, afterClear: slotName }).toEqual({
    afterPick: "LCM Pikachu",
    afterClear: "Empty LCM slot",
  });
});
