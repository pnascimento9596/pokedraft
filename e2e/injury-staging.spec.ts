import { expect, test } from "@playwright/test";
import { GOLDEN_CUP8_V5 } from "../src/engine/versions/__tests__/fixtures";

// The quarter-final of the golden cup8 run under engine 6: Roselia goes down in slot 1 at 42' and
// the assistant brings on Kommo-o.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;
const SHOT = "docs/reports/injury-staging";

interface Snap {
  readonly banner: "medic" | "sub" | null;
  readonly slot: string;
  readonly pose: string;
  readonly kommo: boolean;
}

test("the injured Roselia lies down at 42' and Kommo-o walks on only at the sub beat, at 390px", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "chromium", "one viewport is set explicitly");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const w = window as unknown as { snaps: Snap[] };
    w.snaps = [];
    const dex = (img: Element | null | undefined) =>
      /\/(\d{4})\.\w+$/.exec(img?.getAttribute("src") ?? "")?.[1] ?? "";
    new MutationObserver(() => {
      const pitch = document.querySelector('[data-testid="broadcast"]');
      if (pitch === null) return;
      const medic = document.querySelector('[data-testid="medic"]') !== null;
      const sub = document.querySelector('[data-testid="sub-board"]') !== null;
      const one = pitch.querySelector<HTMLElement>('[data-side="user"][data-slot="1"]');
      const snap: Snap = {
        banner: medic ? "medic" : sub ? "sub" : null,
        slot: dex(one?.querySelector("img")),
        pose: one?.dataset.pose ?? "",
        kommo: [...pitch.querySelectorAll("[data-side] img")].some((i) => dex(i) === "0784"),
      };
      const last = w.snaps.at(-1);
      if (JSON.stringify(last) !== JSON.stringify(snap)) w.snaps.push(snap);
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });

  await page.goto(`/r/${LIVE}`);
  await expect(page.getByTestId("results-record")).toBeVisible();
  await page.getByTestId("match-QF").getByTestId("watch-live").click();
  const replay = page.getByTestId("match-replay");
  await expect(replay.getByTestId("broadcast")).toBeVisible();

  await expect(replay.getByTestId("medic")).toHaveText("Roselia is down", { timeout: 60_000 });
  await page.screenshot({ path: `${SHOT}/390-roselia-down.png` });
  await expect(replay.getByTestId("sub-board")).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: `${SHOT}/390-kommo-o-walks-on.png` });

  const snaps = await page.evaluate(() => (window as unknown as { snaps: Snap[] }).snaps);
  const medic = snaps.filter((s) => s.banner === "medic");
  const sub = snaps.filter((s) => s.banner === "sub");
  console.log(`slot 1 while the medic banner shows: ${JSON.stringify(medic)}`);
  expect(medic.length).toBeGreaterThan(0);
  expect(medic.every((s) => s.slot === "0315" && s.pose === "down" && !s.kommo)).toBe(true);
  expect(sub.length).toBeGreaterThan(0);
  expect(sub.every((s) => s.slot === "0784")).toBe(true);
  expect(snaps.findIndex((s) => s.banner === "sub")).toBeGreaterThan(
    snaps.findIndex((s) => s.banner === "medic"),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
