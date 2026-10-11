import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base, destination, baseline] = process.argv.slice(2);
assert(base && destination, "usage: theme-figures.mjs BASE_URL OUTPUT_DIR [BASELINE_DIR]");
const fixture = JSON.parse(readFileSync("scripts/audit/fixtures.json", "utf8"));
const first = {
  rank: 1,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  token: "pd1.e2e-one",
  teamScore: 845,
  wins: 8,
  draws: 0,
  losses: 0,
  createdAt: "2026-10-09T12:00:00.000Z",
};
const entries = [
  first,
  {
    ...first,
    rank: 2,
    nickname: "Brock",
    token: "pd1.e2e-two",
    teamScore: 790,
    wins: 6,
    draws: 1,
    losses: 1,
  },
];
const browser = await chromium.launch();
mkdirSync(destination, { recursive: true });
try {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    await page.route("**/api/leaderboard?**", (route) =>
      route.fulfill({
        status: 200,
        json: { mode: "cup8", scope: "daily", date: "2026-10-09", entries },
      }),
    );
    for (const [name, path, selector] of [
      ["results", `/r/${fixture.shareRun.token}`, '[data-testid="results"]'],
      [
        "leaderboard",
        "/leaderboard?mode=cup8&scope=daily&date=2026-10-09",
        '[data-testid="board"]',
      ],
    ]) {
      await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
      const region = page.locator(selector);
      await region.waitFor();
      const text = await region.innerText();
      const numbers = (text.match(/\d+(?:\.\d+)?/g) ?? []).sort((a, b) => Number(a) - Number(b));
      const fields =
        name === "results"
          ? {
              score: await page.getByTestId("results-score").innerText(),
              record: await page.getByTestId("results-record").innerText(),
            }
          : { rows: await page.getByTestId("board-row").allTextContents() };
      const report = { name, theme, text, numbers, fields };
      writeFileSync(`${destination}/${name}-${theme}.json`, JSON.stringify(report, null, 2) + "\n");
      if (baseline) {
        const before = JSON.parse(readFileSync(`${baseline}/${name}-${theme}.json`, "utf8"));
        assert.deepEqual(numbers, before.numbers, `${name} ${theme}: numeric values changed`);
        assert.deepEqual(fields, before.fields, `${name} ${theme}: named figures changed`);
      }
      console.log(
        `${name} ${theme}: ${numbers.length} figures${baseline ? " unchanged" : " captured"}`,
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
}
