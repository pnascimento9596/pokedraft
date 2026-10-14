import { chromium, expect, test, webkit } from "@playwright/test";
import { PLAY_8_0, draftRounds, ready } from "./mobile/scenes";

for (const engine of ["chromium", "webkit"] as const) {
  for (const width of [390, 700, 1024]) {
    for (const surface of ["builder", "draft"] as const) {
      test(`${engine} ${width}px filled ${surface} cards contain their role, art, name and types`, async ({
        baseURL,
      }) => {
        const browser = await { chromium, webkit }[engine].launch();
        const context = await browser.newContext({
          baseURL,
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
          colorScheme: "dark",
        });
        try {
          const page = await context.newPage();
          await page.addInitScript(() => {
            localStorage.setItem(
              "pokedraft:panel",
              JSON.stringify({
                showRatings: true,
                showChallengeRatings: true,
              }),
            );
          });
          await page.goto(surface === "builder" ? "/" : PLAY_8_0);
          if (surface === "builder") {
            const randomize = page.getByRole("button", { name: "Randomize", exact: true });
            await ready(page, randomize);
            await randomize.click();
          } else {
            const start = page.getByTestId("run-start");
            await ready(page, start);
            await start.click();
            await draftRounds(page, 16);
            await expect(page.getByTestId("round-header")).toHaveText("Draft complete");
          }
          const cards = page.locator('[data-testid^="slot-"][data-filled="true"]');
          await expect(cards).toHaveCount(16);
          await page.waitForFunction(() => document.fonts.status === "loaded");
          const outside = await cards.evaluateAll((elements) =>
            elements.flatMap((card) => {
              const frame = card.getBoundingClientRect();
              return [
                ...card.querySelectorAll(
                  '[id$="-role"], [id$="-note-score"], [data-player-image], [id$="-name"], [id$="-types"]',
                ),
              ]
                .filter((part) => {
                  const r = part.getBoundingClientRect();
                  return (
                    r.top < frame.top - 0.5 ||
                    r.bottom > frame.bottom + 0.5 ||
                    r.left < frame.left - 0.5 ||
                    r.right > frame.right + 0.5
                  );
                })
                .map(
                  (part) =>
                    `${card.getAttribute("data-testid")}: ${part.id || "art"} exceeds its card`,
                );
            }),
          );
          expect(outside).toEqual([]);
        } finally {
          await context.close();
          await browser.close();
        }
      });
    }
  }
}
