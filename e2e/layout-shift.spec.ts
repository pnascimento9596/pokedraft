import { expect, test } from "@playwright/test";

// The engine 3 golden cup8 run (scripts/audit/fixtures.json on the audit branch): 3-0-2, R16, Team Score 593.
const GOLDEN_RUN =
  "pd3.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAiLDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwxODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsicCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXV0";

// Lighthouse mobile on production measured CLS 0.2114 on /r/<token>, 0.0460 on /daily and 0.028 on
// the 151 start, each time from body > footer.site-footer: the footer sat at the bottom of the first
// viewport under a one-line "Loading" fallback and was pushed down when the content arrived.
const ROUTES = [
  { path: `/r/${GOLDEN_RUN}`, ready: "Team Score" },
  { path: "/daily", ready: "Daily challenge," },
  { path: "/play?mode=kanto151&f=4-3-3&order=squadFirst", ready: "151 Challenge" },
];

test.use({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });

type Shift = { value: number; nodes: string[] };

// Whether the fallback gets painted before React reveals the content is a race, so each route
// loads three times. hadRecentInput is not filtered: touch emulation sets it on these shifts, and
// Lighthouse counts them anyway.
for (const { path, ready } of ROUTES) {
  test(`no layout shift while ${path.slice(0, 24)} loads on a phone`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "layout-shift entries are Chromium only");
    await page.addInitScript(() => {
      const w = window as unknown as { __shifts: Shift[] };
      w.__shifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          sources: { node?: Node | null }[];
        }[]) {
          w.__shifts.push({
            value: entry.value,
            nodes: entry.sources.map((s) =>
              s.node instanceof Element ? `${s.node.tagName}.${s.node.className}` : String(s.node),
            ),
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    const shifts: Shift[] = [];
    for (let load = 0; load < 3; load++) {
      await page.goto(path);
      await expect(page.locator("main")).toContainText(ready);
      await expect(page.locator("footer.site-footer")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      shifts.push(
        ...(await page.evaluate(() => (window as unknown as { __shifts: Shift[] }).__shifts)),
      );
    }
    // Shifts under 0.001 are below Lighthouse reporting precision and are load-timing noise
    // (observed once: 0.00003 from DETAILS.image-settings on /daily, passed on retry). The footer
    // shift this guards against measured 0.21, four orders of magnitude above the filter.
    expect(shifts.filter((s) => s.value >= 0.001)).toEqual([]);
  });
}

for (const width of [360, 390]) {
  test(`ratings-on builder cold load has exactly zero CLS at ${width}px (SX-02)`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "layout-shift entries are Chromium only");
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("pokedraft:panel", JSON.stringify({ showRatings: true }));
      const w = window as unknown as { __exactShifts: number[] };
      w.__exactShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[])
          w.__exactShifts.push(entry.value);
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (let load = 0; load < 3; load++) {
      await page.goto("/");
      await expect(page.getByTestId("ratings-legend")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      expect(
        await page.evaluate(() =>
          (window as unknown as { __exactShifts: number[] }).__exactShifts.reduce(
            (sum, value) => sum + value,
            0,
          ),
        ),
      ).toBe(0);
    }
  });
}
