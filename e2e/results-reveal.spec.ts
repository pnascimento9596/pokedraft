import { expect, test, type Page } from "@playwright/test";
import { DEEP_LINK } from "./pins";

// A bot-drafted cup8 run on the live engine (scripts/audit/tokens.mts botCup8Token("e2e-reveal-59")):
// 8-0-0, Champions, Team Score 868, player of the tournament Dragapult.
const CHAMPION = {
  url: "/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=e2e-reveal-59",
  token:
    "pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwiYyIsInMiXSwiZTJlLXJldmVhbC01OSIsW1sicCIsMjU3LCJzOCJdLFsicCIsMjMyLCJzMSJdLFsicCIsOTQzLCJzMiJdLFsicCIsMTAwNywiczMiXSxbInAiLDMzNCwiczQiXSxbInAiLDQ0NSwiczkiXSxbInAiLDg4NywiczEwIl0sWyJwIiwyMTQsInMwIl0sWyJwIiwxNTEsInM1Il0sWyJwIiw0OTEsInM2Il0sWyJwIiw4NzMsInM3Il0sWyJyIiwidCJdLFsicCIsNjUyLCJiMCJdLFsiciIsInQiXSxbInIiLCJ0Il0sWyJwIiw4MjgsImIxIl0sWyJwIiwyNzcsImIyIl0sWyJwIiw2ODcsImIzIl0sWyJwIiw4NDEsImI0Il1dXQ",
};

// An engine-1 cup8 run (ResultsView.test.tsx FLAWLESS): 8-0-0, flawless, Team Score 845.
const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const PROOF = "docs/reports/results-reveal";

// The live results of a finished run, entered the way a reload enters them: from the run's saved
// checkpoint, so the page shows the results screen of the live variant without drafting 16 picks.
async function openLiveResults(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate((token) => {
    localStorage.setItem(
      "pokedraft.run.cup8",
      JSON.stringify({ screen: "results", token, daily: null }),
    );
  }, CHAMPION.token);
  await page.goto(CHAMPION.url);
  await expect(page.getByTestId("results-score")).toHaveText("868");
}

const hero = (page: Page) => page.locator("section.module-card:has(> header h1)");

// Holds every animation in the hero at one time, so a frame can be read and photographed.
async function holdHeroAt(page: Page, ms: number): Promise<void> {
  await hero(page).evaluate((el, at) => {
    for (const animation of el.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = at;
    }
  }, ms);
}

async function overlay(page: Page) {
  return page.getByTestId("results-score").evaluate((el) => {
    const after = getComputedStyle(el, "::after");
    return {
      content: after.content,
      n: after.getPropertyValue("--n").trim(),
      visibility: after.visibility,
      ink: getComputedStyle(el).color,
    };
  });
}

test.describe("staged reveal", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });

  test("the first live view counts the Team Score up from 0, and a reload shows the final hero at once (catches a reveal on every visit)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await openLiveResults(page);
    await expect(hero(page)).toHaveAttribute("data-reveal", "staged");
    await expect(hero(page).getByTestId("results-trophy")).toBeVisible();
    await expect(hero(page).getByTestId("results-mvp")).toContainText("Dragapult");

    await holdHeroAt(page, 0);
    expect(await overlay(page)).toEqual({
      content: "counter(n)",
      n: "0",
      visibility: "visible",
      ink: "rgba(0, 0, 0, 0)",
    });
    await page.screenshot({ path: `${PROOF}/reveal-0ms-390.png` });
    await holdHeroAt(page, 600);
    expect((await overlay(page)).ink).toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ path: `${PROOF}/reveal-600ms-390.png` });
    await holdHeroAt(page, 2000);
    expect(await overlay(page)).toMatchObject({ visibility: "hidden", ink: "rgb(244, 247, 250)" });
    await page.screenshot({ path: `${PROOF}/reveal-2000ms-390.png` });

    await page.reload();
    await expect(page.getByTestId("results-score")).toHaveText("868");
    await expect(page.getByTestId("results-record")).toHaveText("8-0-0");
    await expect(hero(page)).not.toHaveAttribute("data-reveal", /.*/);
    expect((await overlay(page)).content).toBe("none");
    expect(errors).toEqual([]);
  });

  test("a shared run shows the final hero with no count-up", async ({ page }) => {
    await page.goto(`/r/${CHAMPION.token}`);
    await expect(page.getByTestId("results-score")).toHaveText("868");
    await expect(hero(page)).not.toHaveAttribute("data-reveal", /.*/);
    expect((await overlay(page)).content).toBe("none");
  });
});

test("reduced motion renders no count-up overlay on the first live view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLiveResults(page);
  await expect(hero(page)).not.toHaveAttribute("data-reveal", /.*/);
  expect(await overlay(page)).toMatchObject({ content: "none", ink: "rgb(244, 247, 250)" });
  expect(await hero(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});

for (const [theme, bg, ink] of [
  ["light", "rgb(244, 215, 122)", "rgb(58, 42, 8)"],
  ["dark", "rgb(46, 36, 16)", "rgb(244, 215, 122)"],
] as const) {
  test(`a flawless run's mark is gold in ${theme} (catches the mark left on the ok green)`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(`/r/${FLAWLESS}`);
    const mark = page.getByTestId("results-flawless");
    await expect(mark).toContainText("Flawless. Every match won, cup lifted.");
    expect(
      await mark.evaluate((el) => {
        const root = getComputedStyle(document.documentElement);
        const style = getComputedStyle(el);
        return {
          tokens: [root.getPropertyValue("--gold-bg"), root.getPropertyValue("--gold-ink")].map(
            (v) => v.trim(),
          ),
          background: style.backgroundColor,
          color: style.color,
        };
      }),
    ).toEqual({
      tokens: theme === "light" ? ["#f4d77a", "#3a2a08"] : ["#2e2410", "#f4d77a"],
      background: bg,
      color: ink,
    });
  });
}

test.describe("Watch live focus", () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("closing Watch live returns focus and scroll to the button that opened it (catches focus lost to the page top)", async ({
    page,
  }) => {
    await page.goto(`/r/${DEEP_LINK.token}`);
    const opener = page.getByTestId("match-R32").getByTestId("watch-live");
    await opener.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await opener.click();
    const replay = page.getByTestId("match-replay");
    await expect(replay.getByTestId("match-replay-title")).toBeFocused();
    await replay.getByTestId("match-replay-close").click();
    await expect(replay).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        testid: document.activeElement?.getAttribute("data-testid"),
        round: document.activeElement?.closest("li")?.getAttribute("data-testid"),
      })),
    ).toEqual({ testid: "watch-live", round: "match-R32" });
    expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(1);
  });

  test("closing a goal link's replay focuses that match's Watch live button", async ({ page }) => {
    await page.goto(DEEP_LINK.href);
    const replay = page.getByTestId("match-replay");
    await expect(replay.getByTestId("match-replay-title")).toBeFocused();
    await replay.getByTestId("match-replay-close").click();
    await expect(replay).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        testid: document.activeElement?.getAttribute("data-testid"),
        round: document.activeElement?.closest("li")?.getAttribute("data-testid"),
      })),
    ).toEqual({ testid: "watch-live", round: "match-G1" });
  });
});

for (const width of [390, 360, 320]) {
  for (const theme of ["light", "dark"] as const) {
    test(`proof: the final hero, trophy, gold mark and MVP card fit at ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(`/r/${CHAMPION.token}`);
      await expect(hero(page).getByTestId("results-mvp")).toContainText("Dragapult");
      await expect(hero(page).getByTestId("results-flawless")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({ path: `${PROOF}/hero-${width}-${theme}.png` });
      const highlights = page.getByTestId("match-highlights");
      await highlights.scrollIntoViewIfNeeded();
      await expect(highlights.getByRole("heading", { level: 2 })).toHaveText("Highlights");
      await highlights.screenshot({ path: `${PROOF}/highlights-${width}-${theme}.png` });
    });
  }
}
