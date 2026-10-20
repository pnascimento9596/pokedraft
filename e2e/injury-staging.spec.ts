import { expect, test } from "@playwright/test";
import { INJURY_STAGING as PIN, LIVE_GOLDEN_CUP8 } from "./pins";

// The golden cup8 run under the live prefix: its first injury that the assistant answers with a
// substitute, in e2e/pins.ts.
const LIVE = LIVE_GOLDEN_CUP8;
const SHOT = "docs/reports/injury-staging";

interface Snap {
  readonly banner: "medic" | "sub" | null;
  readonly slot: string;
  readonly pose: string;
  readonly subOn: boolean;
}

test(`the injured ${PIN.injured} lies down at ${PIN.minute}' and ${PIN.sub} walks on only at the sub beat, at 390px`, async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ slot, subDex }) => {
      const w = window as unknown as { snaps: Snap[] };
      w.snaps = [];
      const dex = (img: Element | null | undefined) =>
        /\/(\d{4})\.\w+$/.exec(img?.getAttribute("src") ?? "")?.[1] ?? "";
      new MutationObserver(() => {
        const pitch = document.querySelector('[data-testid="broadcast"]');
        if (pitch === null) return;
        const medic = document.querySelector('[data-testid="medic"]') !== null;
        const sub = document.querySelector('[data-testid="sub-board"]') !== null;
        const one = pitch.querySelector<HTMLElement>(`[data-side="user"][data-slot="${slot}"]`);
        const snap: Snap = {
          banner: medic ? "medic" : sub ? "sub" : null,
          slot: dex(one?.querySelector("img")),
          pose: one?.dataset.pose ?? "",
          subOn: [...pitch.querySelectorAll("[data-side] img")].some((i) => dex(i) === subDex),
        };
        const last = w.snaps.at(-1);
        if (JSON.stringify(last) !== JSON.stringify(snap)) w.snaps.push(snap);
      }).observe(document, { subtree: true, childList: true, attributes: true });
    },
    { slot: PIN.slot, subDex: PIN.subDex },
  );

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId(`match-${PIN.round}`).getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();

  await expect(replay.getByTestId("medic")).toHaveText(`${PIN.injured} is down`, {
    timeout: 60_000,
  });
  await page.screenshot({ path: `${SHOT}/390-roselia-down.png` });
  await expect(replay.getByTestId("sub-board")).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: `${SHOT}/390-kommo-o-walks-on.png` });

  const snaps = await page.evaluate(() => (window as unknown as { snaps: Snap[] }).snaps);
  const medic = snaps.filter((s) => s.banner === "medic");
  const sub = snaps.filter((s) => s.banner === "sub");
  console.log(`slot ${PIN.slot} while the medic banner shows: ${JSON.stringify(medic)}`);
  expect(medic.length).toBeGreaterThan(0);
  expect(medic.every((s) => s.slot === PIN.injuredDex && s.pose === "down" && !s.subOn)).toBe(true);
  expect(sub.length).toBeGreaterThan(0);
  expect(sub.every((s) => s.slot === PIN.subDex)).toBe(true);
  expect(snaps.findIndex((s) => s.banner === "sub")).toBeGreaterThan(
    snaps.findIndex((s) => s.banner === "medic"),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
