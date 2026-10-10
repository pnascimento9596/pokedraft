// GATE 4 of dispatch 7: the mobile acceptance suite.
//
// It runs on three phone projects with touch on (iphone-se and iphone-14 on WebKit, pixel-7 on
// Chromium, see playwright.config.ts). In CI it runs against the local production build as part of
// `pnpm test:e2e`. Against a deployment, on demand:
//
//   PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test e2e/mobile-acceptance.spec.ts
//
// That switch turns the local web server off. The suite writes nothing. Every request to
// /api/leaderboard is answered by a route stub, so no request for it reaches the target host.
//
// Group 0 checks the harness helpers themselves on controlled pages (page.setContent). The other
// groups assert the seven GATE 4 items. Every test title starts with its group number.

import { expect, test, type Page } from "@playwright/test";
import {
  documentScrollWidth,
  drag,
  inViewport,
  interactiveTargets,
  isChromium,
  pointerDrag,
  resetScrollBaseline,
  settle,
  settledScrollY,
  tapInView,
  touchDrag,
  touchScroll,
  undersized,
  widestRight,
} from "./mobile/helpers";

test.use({ reducedMotion: "reduce" });

// ---------------------------------------------------------------------------------------------
// Group 0. The harness must not lie: each verdict helper is proven on a page where the answer is
// known, for both the failing and the passing case.

const HEAD =
  '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">' +
  "<style>*{box-sizing:border-box}body{margin:0}</style>";

async function load(page: Page, body: string): Promise<void> {
  await page.setContent(`${HEAD}${body}`);
}

function eventLog(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { log: string[] }).log);
}

test("0 self-check: inViewport passes a visible control and fails below the fold, half visible, past the edge, hidden and under a fixed bar", async ({
  page,
}) => {
  await load(
    page,
    `
    <div data-testid="bar" style="position:fixed;z-index:10;top:0;left:0;right:0;height:60px;background:#444"></div>
    <button data-testid="ok" style="position:absolute;top:100px;left:10px;width:120px;height:50px">ok</button>
    <button data-testid="under" style="position:absolute;top:10px;left:10px;width:120px;height:40px">under</button>
    <button data-testid="below" style="position:absolute;top:3000px;left:10px;width:120px;height:50px">below</button>
    <button data-testid="half" style="position:absolute;left:10px;width:120px;height:80px">half</button>
    <button data-testid="edge" style="position:absolute;top:200px;left:300px;width:200px;height:50px">past the right edge</button>
    <button data-testid="nested" style="position:absolute;top:300px;left:10px;width:150px;height:50px"><span style="display:block;height:100%">nested</span></button>
    <button data-testid="gone" style="position:absolute;top:400px;left:10px;width:100px;height:50px;visibility:hidden">gone</button>
    `,
  );
  await page.evaluate(() => {
    const half = document.querySelector<HTMLElement>('[data-testid="half"]')!;
    half.style.top = `${window.innerHeight - 40}px`;
  });
  const at = (id: string) => inViewport(page, page.getByTestId(id));

  expect((await at("ok")).ok).toBe(true);
  expect((await at("nested")).ok).toBe(true);

  const below = await at("below");
  expect(below.ok).toBe(false);
  expect(below.problem).toContain("not fully inside the visual viewport");
  expect(below.box!.y).toBeGreaterThan(2000);

  const half = await at("half");
  expect(half.ok).toBe(false);
  expect(half.problem).toContain("not fully inside the visual viewport");

  const edge = await at("edge");
  expect(edge.ok).toBe(false);
  expect(edge.problem).toContain("not fully inside the visual viewport");

  const under = await at("under");
  expect(under.ok).toBe(false);
  expect(under.problem).toContain("covered at its centre");
  expect(under.coveredBy).toContain("data-testid=bar");

  const gone = await at("gone");
  expect(gone.ok).toBe(false);
  expect(gone.problem).toContain("not rendered");
});

test("0 self-check: tapInView taps with a real touch, never scrolls, and fails when the page scrolled since the previous step", async ({
  page,
}) => {
  await load(
    page,
    `
    <button data-testid="a" style="position:absolute;top:100px;left:10px;width:120px;height:50px">a</button>
    <button data-testid="b" style="position:absolute;top:200px;left:10px;width:120px;height:50px">b</button>
    <button data-testid="far" style="position:absolute;top:3000px;left:10px;width:120px;height:50px">far</button>
    <script>
      window.log = [];
      document.addEventListener("touchstart", () => window.log.push("touchstart"), { capture: true, passive: true });
      document.addEventListener("click", (e) => window.log.push("click:" + e.target.dataset.testid), true);
    </script>
    `,
  );
  const button = (id: string) => page.getByTestId(id);
  resetScrollBaseline(page);

  await tapInView(page, button("a"), "a");
  expect(await eventLog(page)).toEqual(["touchstart", "click:a"]);

  await tapInView(page, button("b"), "b");
  expect(await eventLog(page)).toEqual(["touchstart", "click:a", "touchstart", "click:b"]);

  // Below the fold: refused. It neither scrolled the page nor tapped.
  await expect(tapInView(page, button("far"), "far")).rejects.toThrow(
    /tap "far": the element is not fully inside the visual viewport/,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await eventLog(page)).toHaveLength(4);

  // The page moved since the previous step, although "a" is still fully visible: refused.
  await page.evaluate(() => window.scrollTo(0, 60));
  await expect(tapInView(page, button("a"), "a again")).rejects.toThrow(
    /tap "a again": the page scrolled from 0 to 60 since the previous step/,
  );
  expect(await eventLog(page)).toHaveLength(4);

  // After the test says the move was deliberate, the same tap goes through.
  resetScrollBaseline(page);
  await tapInView(page, button("a"), "a after reset");
  expect(await eventLog(page)).toEqual([
    "touchstart",
    "click:a",
    "touchstart",
    "click:b",
    "touchstart",
    "click:a",
  ]);
});

test("0 self-check: widestRight and documentScrollWidth pass a clean page and catch an overflowing child, even when html and body clip it", async ({
  page,
}) => {
  const width = () => page.evaluate(() => document.documentElement.clientWidth);

  await load(page, '<div style="width:100px;height:40px;background:#555"></div>');
  expect(await widestRight(page)).toBe(100);
  expect(await widestRight(page)).toBeLessThanOrEqual(await width());
  expect(await documentScrollWidth(page)).toBeLessThanOrEqual(await width());

  // The app sets overflow-x:hidden on html and body, which hides the overflow from scrollWidth
  // in some engines. widestRight reads the element boxes, so it still sees the 900px child.
  await load(
    page,
    `<style>html,body{overflow-x:hidden}</style>
     <div style="width:100px;height:40px;background:#555"></div>
     <div style="width:900px;height:40px;background:#a33"></div>`,
  );
  expect(await widestRight(page)).toBe(900);
  expect(await widestRight(page)).toBeGreaterThan(await width());

  // Without clipping, the plain scrollWidth check sees it too.
  await load(page, '<div style="width:900px;height:40px;background:#a33"></div>');
  expect(await documentScrollWidth(page)).toBeGreaterThanOrEqual(900);
  expect(await documentScrollWidth(page)).toBeGreaterThan(await width());
});

test("0 self-check: interactiveTargets reports 30x30 below 44x44, passes 44x44, skips hidden and inert controls, and never counts a pseudo-element hit area", async ({
  page,
}) => {
  await load(
    page,
    `
    <style>#pseudo::after{content:"";position:absolute;inset:-10px}</style>
    <button data-testid="b30" style="width:30px;height:30px">x</button>
    <button data-testid="b44" style="width:44px;height:44px">y</button>
    <button data-testid="pseudo" style="position:relative;width:30px;height:30px">z</button>
    <a data-testid="link20" href="#x" style="display:inline-block;width:60px;height:20px">link</a>
    <p>Read <a data-testid="inline" href="#y">the rules</a> before you start.</p>
    <input data-testid="field" style="width:100px;height:30px" aria-label="name">
    <div data-testid="role" role="button" style="width:20px;height:20px"></div>
    <div data-testid="tab0" tabindex="0" style="width:20px;height:20px"></div>
    <div data-testid="tabminus" tabindex="-1" style="width:20px;height:20px"></div>
    <div aria-hidden="true"><button data-testid="ariaHidden" style="width:10px;height:10px"></button></div>
    <button data-testid="displayNone" style="display:none;width:10px;height:10px"></button>
    <div inert><button data-testid="inertButton" style="width:10px;height:10px"></button></div>
    <button data-testid="zero" style="width:0;height:0;padding:0;border:0"></button>
    <details>
      <summary data-testid="summary" style="display:block;height:20px">more</summary>
      <button data-testid="inClosedDetails" style="width:10px;height:10px"></button>
    </details>
    `,
  );
  const targets = await interactiveTargets(page);
  const byId = (id: string) => targets.find((t) => t.selector.includes(`testid=${id}`));

  for (const id of [
    "tabminus",
    "ariaHidden",
    "displayNone",
    "inertButton",
    "zero",
    "inClosedDetails",
  ]) {
    expect(byId(id), `${id} must not be scanned`).toBeUndefined();
  }

  expect(byId("b30")).toMatchObject({ width: 30, height: 30 });
  expect(byId("b44")).toMatchObject({ width: 44, height: 44 });
  expect(byId("pseudo")).toMatchObject({ width: 30, height: 30 });
  expect(byId("link20")).toMatchObject({ width: 60, height: 20, inlineLink: false });
  expect(byId("inline")?.inlineLink).toBe(true);
  expect(byId("inline")?.text).toBe("the rules");

  const small = undersized(targets)
    .map((t) => /testid=(\w+)/.exec(t.selector)![1])
    .sort();
  expect(small).toEqual(
    ["b30", "field", "inline", "link20", "pseudo", "role", "summary", "tab0"].sort(),
  );
});

test("0 self-check: touch gestures are real touch in Chromium, and the WebKit drag is a mouse drag that says so", async ({
  page,
}) => {
  await load(
    page,
    `
    <div data-testid="pad" style="height:200px;background:#333;touch-action:none"></div>
    <div style="height:3000px"></div>
    <script>
      window.log = [];
      const pad = document.querySelector('[data-testid="pad"]');
      for (const type of ["pointerdown", "pointermove", "pointerup"]) {
        pad.addEventListener(type, (e) => window.log.push(type + ":" + e.pointerType + ":" + Math.round(e.clientX) + ":" + Math.round(e.clientY)));
      }
    </script>
    `,
  );
  const kinds = async () => [...new Set((await eventLog(page)).map((e) => e.split(":")[1]))];
  const last = async () => (await eventLog(page)).at(-1)!.split(":");

  if (isChromium(page)) {
    await touchDrag(page, { x: 40, y: 100 }, { x: 140, y: 150 });
    expect(await kinds()).toEqual(["touch"]);
    const [type, , x, y] = await last();
    expect([type, x, y]).toEqual(["pointerup", "140", "150"]);

    // A finger swipe that starts outside the touch-action:none pad scrolls the page.
    await touchScroll(page, { x: 200, y: 500 }, 300);
    const scrolled = await settledScrollY(page);
    expect(scrolled).toBeGreaterThan(200);
    expect(scrolled).toBeLessThan(400);

    expect(await drag(page, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe("touch");
    expect(test.info().annotations.some((a) => a.type === "NOT RUN")).toBe(false);
  } else {
    // WebKit has no touch drag API. The helper refuses to pretend, and the mouse drag it falls
    // back to carries pointerType "mouse", which proves nothing about touch arbitration.
    await expect(touchDrag(page, { x: 40, y: 100 }, { x: 140, y: 150 })).rejects.toThrow(
      /touchDrag needs Chromium/,
    );
    await pointerDrag(page, { x: 40, y: 100 }, { x: 140, y: 150 });
    expect(await kinds()).toEqual(["mouse"]);
    const [type, , x, y] = await last();
    expect([type, x, y]).toEqual(["pointerup", "140", "150"]);

    expect(await drag(page, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe("pointer");
    expect(test.info().annotations).toContainEqual({
      type: "NOT RUN",
      description: expect.stringContaining("real touch drag on WebKit: no API"),
    });
  }
});

test("0 self-check: settle waits for a finite entrance animation to finish", async ({ page }) => {
  await load(
    page,
    `
    <style>
      @keyframes rise { from { transform: translateY(40px); } to { transform: translateY(0); } }
      #m { position: absolute; top: 100px; left: 10px; width: 100px; height: 40px;
           animation: rise 500ms ease-out both; }
      @keyframes spin { to { transform: rotate(360deg); } }
      #s { position: absolute; top: 300px; left: 10px; width: 40px; height: 40px;
           animation: spin 1s linear infinite; }
    </style>
    <div id="m"></div><div id="s"></div>
    `,
  );
  await settle(page);
  // An infinite animation must not block settle, and the finite one must be at its end state.
  expect(await page.evaluate(() => document.querySelector("#m")!.getBoundingClientRect().top)).toBe(
    100,
  );
});
