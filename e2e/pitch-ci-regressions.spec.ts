import { expect, test } from "@playwright/test";
import { FORMATION_IDS, type FormationId } from "../src/engine/types";

const lineup = (formation: FormationId) =>
  `pd4.${Buffer.from(
    JSON.stringify([
      ["b", formation, "123456789", 1],
      "pitch-ci-labels",
      Array.from({ length: 16 }, (_, i) => ["l", i + 1, i < 11 ? `s${i}` : `b${i - 11}`]),
    ]),
  ).toString("base64url")}`;

for (const width of [320, 390, 700]) {
  test(`filled tactical labels remain readable and inside cards at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() =>
      localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true })),
    );
    for (const formation of FORMATION_IDS) {
      await page.goto(`/?b=${lineup(formation)}`);
      const cards = page.locator('[data-testid^="slot-"][data-filled="true"]');
      await expect(cards).toHaveCount(16);
      const invalid = await cards.evaluateAll((elements) =>
        elements.flatMap((card) => {
          const label = card.querySelector<HTMLElement>('[id$="-slot"]')!;
          const font = Number.parseFloat(getComputedStyle(label).fontSize);
          const score = card.querySelector<HTMLElement>('[id$="-note-score"]')!;
          const scoreRect = score.getBoundingClientRect();
          const r = label.getBoundingClientRect(),
            frame = card.getBoundingClientRect();
          const overlap =
            Math.min(r.right, scoreRect.right) - Math.max(r.left, scoreRect.left) > 0.5 &&
            Math.min(r.bottom, scoreRect.bottom) - Math.max(r.top, scoreRect.top) > 0.5;
          return overlap ||
            font < 12 ||
            r.left < frame.left - 0.5 ||
            r.right > frame.right + 0.5 ||
            r.top < frame.top - 0.5 ||
            r.bottom > frame.bottom + 0.5
            ? [`${label.textContent}: ${font}px, rating overlap ${overlap}`]
            : [];
        }),
      );
      expect(invalid, formation).toEqual([]);
    }
  });
}
