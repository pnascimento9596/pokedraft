import { expect, test } from "@playwright/test";

const LINEUP = `pd4.${Buffer.from(
  JSON.stringify([
    ["b", "4-3-3", "123456789", 1],
    "pitch-ci-labels",
    Array.from({ length: 16 }, (_, i) => ["l", i + 1, i < 11 ? `s${i}` : `b${i - 11}`]),
  ]),
).toString("base64url")}`;

for (const width of [320, 390]) {
  test(`filled tactical labels remain readable and inside cards at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/?b=${LINEUP}`);
    const cards = page.locator('[data-testid^="slot-"][data-filled="true"]');
    await expect(cards).toHaveCount(16);
    const invalid = await cards.evaluateAll((elements) =>
      elements.flatMap((card) => {
        const label = card.querySelector<HTMLElement>('[id$="-slot"]')!;
        const font = Number.parseFloat(getComputedStyle(label).fontSize);
        const r = label.getBoundingClientRect(),
          frame = card.getBoundingClientRect();
        return font < 12 ||
          r.left < frame.left - 0.5 ||
          r.right > frame.right + 0.5 ||
          r.top < frame.top - 0.5 ||
          r.bottom > frame.bottom + 0.5
          ? [`${label.textContent}: ${font}px`]
          : [];
      }),
    );
    expect(invalid).toEqual([]);
  });
}
