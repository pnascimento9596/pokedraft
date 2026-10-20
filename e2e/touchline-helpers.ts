import { expect, type Locator, type Page } from "@playwright/test";

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export async function minute(page: Page): Promise<number> {
  return Number(await page.getByTestId("match-player").getAttribute("data-minute"));
}

export async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  expect(b, "the element has a box").not.toBeNull();
  return b!;
}

export async function sideScroll(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Every visible button, select and interactive row in the sheet under 44 px on a side. */
export async function smallControls(sheet: Locator): Promise<string[]> {
  return sheet.evaluate((root) => {
    const out: string[] = [];
    const view = root.getBoundingClientRect();
    for (const el of root.querySelectorAll<HTMLElement>("button, select, input, [role=button]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom <= view.top || r.top >= view.bottom) continue;
      if (Math.min(r.width, r.height) < 44)
        out.push(`${el.dataset.testid ?? el.textContent?.trim()} ${r.width}x${r.height}`);
    }
    return out;
  });
}

/** The pitch is wholly on screen and wholly above the sheet. */
export async function expectPitchClear(page: Page): Promise<{ pitch: Box; sheet: Box }> {
  const pitch = await box(page.getByTestId("broadcast"));
  const sheet = await box(page.getByTestId("touchline-sheet"));
  expect(pitch.y, "the pitch top is on screen").toBeGreaterThanOrEqual(0);
  expect(pitch.y + pitch.height, "the sheet starts below the pitch").toBeLessThanOrEqual(sheet.y);
  return { pitch, sheet };
}
