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
          await page.goto(surface === "builder" ? "/" : PLAY_8_0.replace("f=4-4-2", "f=4-3-3"));
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
          await expect(cards.locator('[id$="-note-score"]')).toHaveCount(16);
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
          const overlaps = await cards.evaluateAll((elements) => {
            const hits: string[] = [];
            for (const [index, card] of elements.entries()) {
              const a = card.getBoundingClientRect();
              for (const other of elements.slice(index + 1)) {
                const b = other.getBoundingClientRect();
                if (
                  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
                  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
                )
                  hits.push(
                    `${card.getAttribute("data-testid")} overlaps ${other.getAttribute("data-testid")}`,
                  );
              }
            }
            return hits;
          });
          expect(overlaps).toEqual([]);
        } finally {
          await context.close();
          await browser.close();
        }
      });
    }
  }
}
