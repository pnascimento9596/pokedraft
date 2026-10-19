// GATE 4 of dispatch 7: the mobile acceptance suite.
//
// It runs on three phone projects with touch on: iphone-se and iphone-14 on WebKit, pixel-7 on
// Chromium (see playwright.config.ts). In CI it runs against the local production build as part of
// `pnpm test:e2e`. Against a deployment, on demand:
//
//   PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test e2e/mobile-acceptance.spec.ts
//
// That switch turns the local web server off. The suite writes nothing. Every request to
// /api/leaderboard is answered by a route stub, so none of them reaches the host under test, and
// the share-card endpoints are aborted.
//
// Groups. Every test title starts with its group number, so a CI line maps to GATE 4.
//   0 self-check   the helpers prove their own verdicts on controlled pages
//   1 flow         a full 8-0 Challenge, 151 Challenge and Daily with deliberate scroll and real taps
//   2 overflow     no sideways overflow at 320, 360, 390 and 430 px, dark and light
//   3 targets      every interactive element is at least 44 by 44 px, at 390 and 320 px
//   4 picker       the builder sheet scrolls its own list and closes on swipe, Back and Close
//   5 drag/scroll  a touch drag or two taps swap two tokens, and a swipe on the grass scrolls the page
//   6 keyboard     the focused nickname input stays visible when the viewport shrinks
//   7 landscape    iPhone 14 on its side (the other projects skip these)
//
// Known failures. The suite lands before the mobile fixes, so the tests the pristine app fails
// are listed in KNOWN_RED, one entry per test, each tagged with the fix theme that owns it
// (fixedBy). Once its verdict is in, a listed test calls `test.fail(true, "fixed-by: <tag>. <why>")`.
// Playwright then expects the test to fail, and reports "expected to fail, but passed" as soon as a
// fix makes it pass. That is the RED to GREEN proof: the fix PR deletes the entries it turned green
// and nothing else. The marker is applied after the verdict, so a harness fault (a timeout, a
// missing element) is never hidden by it.
//
//   grep -n "fixedBy" e2e/mobile-acceptance.spec.ts          lists the entries
//   MOBILE_ACCEPTANCE_UNMARKED=1 pnpm exec playwright test e2e/mobile-acceptance.spec.ts
//                                                            ignores every entry, to see all failures
//
// What this suite cannot prove. WebKit has no touch drag, swipe or wheel API, so on iphone-se and
// iphone-14 a drag is a mouse drag (Pointer Events, pointerType mouse) and a list scroll is a
// scrollTop write. Each such test records a NOT RUN annotation. A swipe handler that listens to
// touch events only, or skips pointerType mouse, cannot be seen from there. The viewport shrink in
// group 6 is not an iOS keyboard. Taps are real touches on every project.

import { expect, test as base, type Locator, type Page } from "@playwright/test";
import {
  IOS_BUTTON_FOCUS_SCRIPT,
  ReachError,
  centre,
  clippedText,
  describeBox,
  documentScrollWidth,
  drag,
  horizontalExtent,
  inViewport,
  installIosButtonFocus,
  interactiveTargets,
  isChromium,
  note,
  notRun,
  pageScrollReach,
  panYAllowed,
  pointerDrag,
  reachInView,
  resetScrollBaseline,
  resizeTo,
  scrollThenTap,
  setColorScheme,
  settle,
  settledScrollTop,
  settledScrollY,
  tapInView,
  tapNow,
  touchDrag,
  touchScroll,
  undersized,
  widestElement,
  widestRight,
  type Scheme,
  type TargetInfo,
} from "./mobile/helpers";
import {
  DAILY,
  PLAY_151,
  PLAY_8_0,
  RECORD_151,
  RECORD_8_0,
  SCENES,
  blockCardRequests,
  draftRounds,
  ready,
  stubLeaderboard,
} from "./mobile/scenes";

// Every test gets the leaderboard stub and the card guard. The WebKit projects also get iOS button
// focus. Safari on iOS and macOS never focuses a tapped button and WebKit on Linux does, so
// without the script the iPhone projects would disagree between a laptop and CI. Chromium keeps
// its own behaviour, which is Chrome on Android: it focuses a tapped button.
// The fixture callback is not called `use` because the react-hooks lint rule reads that as a hook.
const test = base.extend({
  page: async ({ page, browserName }, provide) => {
    await stubLeaderboard(page);
    await blockCardRequests(page);
    if (browserName === "webkit") await installIosButtonFocus(page);
    await provide(page);
  },
});

test.use({ reducedMotion: "reduce" });

// ---------------------------------------------------------------------------------------------
// Known failures

type FixedBy = "mobile-foundations" | "draft-layout" | "sheets" | "keyboard" | "targets" | "other";
type ProjectName = "iphone-se" | "iphone-14" | "pixel-7";
const ALL_PROJECTS: readonly ProjectName[] = ["iphone-se", "iphone-14", "pixel-7"];

interface Red {
  readonly fixedBy: FixedBy;
  /**
   * The defect, in the words of the failure it produced. A string covers `projects` (every project
   * when that is left out). A record gives one text per project and covers the projects it names.
   */
  readonly reason: string | Readonly<Partial<Record<ProjectName, string>>>;
  readonly projects?: readonly ProjectName[];
}

const UNMARKED = process.env.MOBILE_ACCEPTANCE_UNMARKED === "1";

function knownRed(title: string, project: string): { fixedBy: FixedBy; reason: string } | null {
  const red = UNMARKED ? undefined : KNOWN_RED[title];
  if (red === undefined) return null;
  if (typeof red.reason !== "string") {
    const reason = red.reason[project as ProjectName];
    return reason === undefined ? null : { fixedBy: red.fixedBy, reason };
  }
  return (red.projects ?? ALL_PROJECTS).includes(project as ProjectName)
    ? { fixedBy: red.fixedBy, reason: red.reason }
    : null;
}

/**
 * Ends an acceptance test. `problems[0]` is the one-line summary, the rest is detail. A test with a
 * KNOWN_RED entry is marked expected-to-fail only here, after the verdict, so an exception thrown
 * earlier (a harness fault) still fails the test visibly.
 */
function conclude(head: string, problems: readonly string[]): void {
  const info = test.info();
  const red = knownRed(info.title, info.project.name);
  if (red !== null) test.fail(true, `fixed-by: ${red.fixedBy}. ${red.reason}`);
  if (problems.length === 0) return;
  const [summary, ...detail] = problems;
  throw new Error([`${head}. ${summary}`, ...detail].join("\n"));
}

// ---------------------------------------------------------------------------------------------
// The red table. One entry per test the pristine app fails (origin/main 928e4b1), keyed by the
// exact test title. Each text is the failure line the entry stands for, copied from an unmarked run
// on macOS, so a number in it can differ a little on another operating system. A fix PR deletes the
// entries it turned green. docs/reports/mobile-acceptance-red.md lists every line in full.

const KNOWN_RED: Readonly<Record<string, Red>> = {};

const round1 = (n: number) => String(Math.round(n * 10) / 10);

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
  const far = tapInView(page, button("far"), "far");
  await expect(far).rejects.toBeInstanceOf(ReachError);
  await expect(far).rejects.toThrow(
    /tap "far": the element is not fully inside the visual viewport/,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await eventLog(page)).toHaveLength(4);

  // The page moved since the previous step, although "a" is still fully visible: refused.
  await page.evaluate(() => window.scrollTo(0, 60));
  const again = tapInView(page, button("a"), "a again");
  await expect(again).rejects.toBeInstanceOf(ReachError);
  await expect(again).rejects.toThrow(
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

test("0 self-check: scrollThenTap scrolls an off-screen control to the middle of the screen and taps it with a real touch", async ({
  page,
}) => {
  await load(
    page,
    `
    <button data-testid="far" style="position:absolute;top:3000px;left:10px;width:120px;height:50px">far</button>
    <div style="height:4200px"></div>
    <script>
      window.log = [];
      document.addEventListener("touchstart", () => window.log.push("touchstart"), { capture: true, passive: true });
      document.addEventListener("click", (e) => window.log.push("click:" + e.target.dataset.testid), true);
    </script>
    `,
  );
  await scrollThenTap(page, page.getByTestId("far"));
  expect(await eventLog(page)).toEqual(["touchstart", "click:far"]);
  const { middle, screen } = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="far"]')!.getBoundingClientRect();
    return { middle: r.top + r.height / 2, screen: window.innerHeight };
  });
  expect(Math.abs(middle - screen / 2)).toBeLessThan(2);
});

test("0 self-check: widestRight and documentScrollWidth pass a clean page and catch an overflowing child, even when html and body clip it", async ({
  page,
}) => {
  const width = () => page.evaluate(() => document.documentElement.clientWidth);

  await load(page, '<div style="width:100px;height:40px;background:#555"></div>');
  expect(await widestRight(page)).toBe(100);
  expect(await widestRight(page)).toBeLessThanOrEqual(await width());
  expect(await documentScrollWidth(page)).toBeLessThanOrEqual(await width());

  // overflow-x:hidden (the app's old setting; it clips now) on html and body hides the overflow
  // from scrollWidth in some engines. widestRight reads the element boxes, so it still sees the 900px child.
  await load(
    page,
    `<style>html,body{overflow-x:hidden}</style>
     <div style="width:100px;height:40px;background:#555"></div>
     <div style="width:900px;height:40px;background:#a33"></div>`,
  );
  expect(await widestRight(page)).toBe(900);
  expect(await widestRight(page)).toBeGreaterThan(await width());
  expect(await widestElement(page)).toContain("reaches x=900");

  // Without clipping, the plain scrollWidth check sees it too.
  await load(page, '<div style="width:900px;height:40px;background:#a33"></div>');
  expect(await documentScrollWidth(page)).toBeGreaterThanOrEqual(900);
  expect(await documentScrollWidth(page)).toBeGreaterThan(await width());

  // The contents of a closed <details> are not rendered, although WebKit still reports a size for
  // them. They must not count, and they must count once the details is open.
  await load(
    page,
    `<details data-testid="more"><summary>more</summary>
       <div style="width:900px;height:40px;background:#a33">wide</div></details>`,
  );
  expect(await widestRight(page)).toBeLessThanOrEqual(await width());
  await page.getByTestId("more").evaluate((el) => ((el as HTMLDetailsElement).open = true));
  expect(await widestRight(page)).toBe(900);
});

test("0 self-check: a wide child in a box the player can scroll sideways does not widen the page, and is reported as an inner scroller", async ({
  page,
}) => {
  const wide = '<div style="width:900px;height:20px;background:#a33">wide</div>';

  // overflow-x:auto and scroll: the page ends at the scroller. The scroller is reported.
  for (const overflow of ["auto", "scroll"]) {
    await load(
      page,
      `<div class="box" style="width:200px;overflow-x:${overflow};background:#333">${wide}</div>`,
    );
    const extent = await horizontalExtent(page);
    expect(extent.right, `overflow-x:${overflow}`).toBe(200);
    expect(extent.scrollers).toHaveLength(1);
    expect(extent.scrollers[0]).toMatchObject({ clientWidth: 200, scrollWidth: 900 });
    expect(extent.scrollers[0].name).toContain("div.box");
  }

  // A scroller with room to spare is not reported.
  await load(
    page,
    '<div style="width:200px;overflow-x:auto"><div style="width:100px;height:20px"></div></div>',
  );
  expect((await horizontalExtent(page)).scrollers).toEqual([]);

  // overflow:hidden and clip cut the child off for good, so the child still counts.
  for (const overflow of ["hidden", "clip"]) {
    await load(page, `<div style="width:200px;overflow-x:${overflow}">${wide}</div>`);
    expect((await horizontalExtent(page)).right, `overflow-x:${overflow}`).toBe(900);
  }

  // A positioned child is not judged by the scroller around it.
  await load(
    page,
    '<div style="width:200px;overflow-x:auto"><div style="position:absolute;left:0;width:900px;height:20px;background:#a33">abs</div></div>',
  );
  expect((await horizontalExtent(page)).right).toBe(900);

  // The scroller itself can be too wide, and then it counts.
  await load(page, `<div style="width:500px;overflow-x:auto">${wide}</div>`);
  expect((await horizontalExtent(page)).right).toBe(500);

  // Two scrollers deep: every element is cut at the scrollers around it and the page ends at the
  // outer one, although the block between them is 600px wide.
  await load(
    page,
    `<div style="width:300px;overflow-x:auto"><div style="width:600px"><div style="width:150px;overflow-x:auto">${wide}</div></div></div>`,
  );
  expect((await horizontalExtent(page)).right).toBe(300);
});

test("0 self-check: resizeTo lays the page out at every width and size the suite measures", async ({
  page,
}) => {
  await load(page, '<div style="width:100%;height:40px;background:#555"></div>');
  const sizes = [
    { width: 320, height: 800 },
    { width: 430, height: 800 },
    { width: 360, height: 800 },
    { width: 390, height: 800 },
    { width: 844, height: 390 },
    { width: 750, height: 340 },
    { width: 320, height: 800 },
  ];
  for (const size of sizes) {
    await resizeTo(page, size);
    // A block child fills the layout width, so its right edge is the width the page laid out at.
    expect(await widestRight(page)).toBe(size.width);
    expect(await page.evaluate(() => window.innerHeight)).toBe(size.height);
  }
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

test("0 self-check: interactiveTargets keeps only the open modal dialog in scope", async ({
  page,
}) => {
  await load(
    page,
    `
    <button data-testid="behind" style="width:20px;height:20px">behind</button>
    <dialog data-testid="dialog"><button data-testid="inside" style="width:20px;height:20px">inside</button></dialog>
    `,
  );
  const ids = async () =>
    (await interactiveTargets(page)).map((t) => /testid=(\w+)/.exec(t.selector)![1]).sort();
  expect(await ids()).toEqual(["behind"]);
  await page.evaluate(() => document.querySelector("dialog")!.showModal());
  expect(await ids()).toEqual(["inside"]);
});

test("0 self-check: pageScrollReach passes a page that scrolls to its end and flags an overflow:hidden trap", async ({
  page,
}) => {
  const tall =
    '<div style="height:2000px;background:#333"><button style="margin-top:1900px">end</button></div>';

  await load(page, tall);
  const clean = await pageScrollReach(page);
  expect(clean.scrollHeight).toBeGreaterThan(clean.clientHeight);
  expect(clean.scrolledTo).toBeGreaterThan(0);
  expect(clean.contentBottom).toBeLessThanOrEqual(clean.reachableBottom + 1);
  expect(clean.viewportOverflowY).toBe("visible");

  // Trap one: html and body are as tall as the screen and hide overflow, so the content below the
  // fold is cut off and no scroll can bring it in.
  await load(page, `<style>html,body{height:100%;overflow:hidden}</style>${tall}`);
  const clipped = await pageScrollReach(page);
  expect(clipped.viewportOverflowY).toBe("hidden");
  expect(clipped.contentBottom).toBeGreaterThan(clipped.reachableBottom + 100);

  // Trap two: the document is tall but html hides vertical overflow. A script can scroll it
  // (scrolledTo > 0) and a player cannot, so the overflow value is what gives it away.
  await load(page, `<style>html{overflow:hidden}</style>${tall}`);
  const hiddenRoot = await pageScrollReach(page);
  expect(hiddenRoot.scrollHeight).toBeGreaterThan(hiddenRoot.clientHeight);
  expect(hiddenRoot.scrolledTo).toBeGreaterThan(0);
  expect(hiddenRoot.viewportOverflowY).toBe("hidden");

  // overflow-x:hidden, the app's old setting, leaves vertical scrolling on.
  await load(page, `<style>html,body{overflow-x:hidden}</style>${tall}`);
  const app = await pageScrollReach(page);
  expect(app.viewportOverflowY).toBe("auto");
  expect(app.scrolledTo).toBeGreaterThan(0);

  // Content of a closed <details> is not rendered, so it is not content the page must reach.
  await load(
    page,
    `<details><summary>more</summary><div style="height:3000px">hidden</div></details>`,
  );
  const closed = await pageScrollReach(page);
  expect(closed.contentBottom).toBeLessThan(closed.clientHeight);
});

test("0 self-check: clippedText flags text with no box or wholly outside a clipping ancestor and leaves scrollable content alone", async ({
  page,
}) => {
  await load(
    page,
    `
    <p>visible text</p>
    <div style="height:40px;overflow:hidden"><div style="height:80px"></div><span>cut off</span></div>
    <p style="height:0;overflow:hidden">no height</p>
    <div style="height:60px;overflow:hidden">
      <ul style="height:60px;overflow-y:auto;margin:0;padding:0;list-style:none">
        <li style="height:100px">first</li><li>second</li>
      </ul>
    </div>
    <details><summary>more</summary><p>inside a closed details</p></details>
    `,
  );
  const found = await clippedText(page);
  expect(found).toHaveLength(2);
  expect(found.some((f) => f.includes('"cut off" lies wholly outside'))).toBe(true);
  expect(found.some((f) => /"no height" has a \d+x0 box/.test(f))).toBe(true);
});

test("0 self-check: panYAllowed reads touch-action up the tree", async ({ page }) => {
  await load(
    page,
    `
    <div><span data-testid="plain">a</span></div>
    <div style="touch-action:none"><span data-testid="none">b</span></div>
    <div style="touch-action:pan-y"><span data-testid="panY">c</span></div>
    <div style="touch-action:pan-x"><span data-testid="panX">d</span></div>
    `,
  );
  const allowed = async (id: string) => panYAllowed(page.getByTestId(id));
  expect(await allowed("plain")).toBe(true);
  expect(await allowed("none")).toBe(false);
  expect(await allowed("panY")).toBe(true);
  expect(await allowed("panX")).toBe(false);
});

test("0 self-check: touch gestures are real touch in Chromium, and the WebKit drag is a mouse drag that says so", async ({
  page,
}) => {
  await load(
    page,
    `
    <div data-testid="pad" style="height:200px;background:#333;touch-action:none">
      <img alt="" style="display:block;width:60px;height:60px;margin:40px"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='red'/%3E%3C/svg%3E">
    </div>
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

    // A mouse drag that starts on a picture begins the browser's native image drag, which would
    // end the pointer stream. The helper cancels it, so the stream still reaches pointerup.
    await page.evaluate(() => ((window as unknown as { log: string[] }).log.length = 0));
    await pointerDrag(page, { x: 70, y: 70 }, { x: 140, y: 150 });
    const [typeFromImage, , xFromImage, yFromImage] = await last();
    expect([typeFromImage, xFromImage, yFromImage]).toEqual(["pointerup", "140", "150"]);

    expect(await drag(page, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe("pointer");
    expect(test.info().annotations).toContainEqual({
      type: "NOT RUN",
      description: "real touch drag on WebKit: no API",
    });
  }
});

test("0 self-check: settle brings a finite entrance animation to its end state at once and leaves an infinite one running", async ({
  page,
}) => {
  // The rise lasts a minute. A settle that waited for it would run into the test timeout, and one
  // that did not finish it would read the start value.
  await load(
    page,
    `
    <style>
      @keyframes rise { from { transform: translateY(40px); } to { transform: translateY(0); } }
      #m { position: absolute; top: 100px; left: 10px; width: 100px; height: 40px;
           animation: rise 60s linear both; }
      @keyframes spin { to { transform: rotate(360deg); } }
      #s { position: absolute; top: 300px; left: 10px; width: 40px; height: 40px;
           animation: spin 1s linear infinite; }
    </style>
    <div id="m"></div><div id="s"></div>
    `,
  );
  const top = () => page.evaluate(() => document.querySelector("#m")!.getBoundingClientRect().top);
  expect(await top(), "before settle the element is at the start of its animation").toBeGreaterThan(
    139,
  );
  await settle(page);
  expect(await top(), "after settle it is at the end").toBe(100);
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    ),
    "the infinite animation keeps running",
  ).toBe(1);
});

test("0 self-check: settle returns the end value of a colour transition that lasts 0.01 ms", async ({
  page,
}) => {
  // The app shortens every transition to 0.01 ms under reduced motion. Waiting on
  // Animation.finished hung Chromium on exactly these, so the loop repeats the change.
  await load(
    page,
    `
    <style>
      #t { color: rgb(255, 0, 0); transition: color 0.01ms; }
      #t.on { color: rgb(0, 0, 255); }
    </style>
    <p id="t">text</p>
    `,
  );
  for (let i = 0; i < 8; i++) {
    const on = i % 2 === 0;
    await page.evaluate((flag) => document.querySelector("#t")!.classList.toggle("on", flag), on);
    await settle(page);
    const color = await page.evaluate(() => getComputedStyle(document.querySelector("#t")!).color);
    expect(color).toBe(on ? "rgb(0, 0, 255)" : "rgb(255, 0, 0)");
  }
});

test("0 self-check: setColorScheme switches the page between dark and light", async ({ page }) => {
  await load(
    page,
    `
    <style>
      body { background: rgb(0, 0, 0); color: rgb(255, 255, 255); }
      @media (prefers-color-scheme: light) { body { background: rgb(255, 255, 255); color: rgb(0, 0, 0); } }
    </style>
    <p>text</p>
    `,
  );
  expect(await setColorScheme(page, "light")).toBe("rgb(255, 255, 255) rgb(0, 0, 0)");
  expect(await setColorScheme(page, "dark")).toBe("rgb(0, 0, 0) rgb(255, 255, 255)");
});

test("0 self-check: a tap leaves no button focused, as on iOS, and a text field keeps its focus", async ({
  page,
}) => {
  await load(
    page,
    `
    <button data-testid="button" style="position:absolute;top:100px;left:10px;width:120px;height:50px">b</button>
    <input data-testid="field" style="position:absolute;top:200px;left:10px;width:200px;height:40px" aria-label="name">
    `,
  );
  const active = () =>
    page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "body");
  const button = page.getByTestId("button");
  const field = page.getByTestId("field");

  if (isChromium(page)) {
    // The reason the script exists: Chromium focuses a tapped button, Safari does not.
    await tapNow(page, button, "button");
    expect(await active()).toBe("button");
  }

  await page.addScriptTag({ content: IOS_BUTTON_FOCUS_SCRIPT });
  await tapNow(page, button, "button");
  expect(await active()).toBe("body");

  await tapNow(page, field, "field");
  await expect.poll(active).toBe("field");
});

// ---------------------------------------------------------------------------------------------
// Group 1. The scrollable stadium keeps every primary action reachable with an uncovered real tap.

class Walk {
  readonly failures: ReachError[] = [];
  steps = 0;

  constructor(private readonly page: Page) {
    resetScrollBaseline(page);
  }

  async tap(label: string, locator: Locator): Promise<void> {
    this.steps++;
    try {
      await tapInView(this.page, locator, label);
    } catch (error) {
      if (!(error instanceof ReachError)) throw error;
      this.failures.push(error);
      // A player would scroll the control into view and tap it. Judge the next step from there.
      await scrollThenTap(this.page, locator);
      resetScrollBaseline(this.page);
    }
  }

  async see(label: string, locator: Locator): Promise<void> {
    this.steps++;
    try {
      await reachInView(this.page, locator, label);
    } catch (error) {
      if (!(error instanceof ReachError)) throw error;
      this.failures.push(error);
      await locator.first().scrollIntoViewIfNeeded();
      resetScrollBaseline(this.page);
    }
  }

  problems(): string[] {
    if (this.failures.length === 0) return [];
    const [first, ...rest] = this.failures;
    const shown = rest.slice(0, 10).map((f) => `  also: ${f.oneLine()}`);
    return [
      `${this.failures.length} of ${this.steps} steps needed a page scroll or were covered. First failing step: ${first.oneLine()}`,
      first.message.replace(/^/gm, "  "),
      ...shown,
      ...(rest.length > shown.length ? [`  and ${rest.length - shown.length} more`] : []),
    ];
  }
}

interface Flow {
  readonly url: string;
  /** False when the single offered card is already selected, so a tap would pick nothing. */
  readonly pickCandidate: boolean;
  readonly record: string | null;
}

async function scrollDraftControlToView(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await settle(page);
  expect((await inViewport(page, locator)).problem).toBeNull();
  const bounds = await page.evaluate(() => ({
    y: scrollY,
    max: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeLessThanOrEqual(bounds.max);
  resetScrollBaseline(page);
}

async function playFlow(page: Page, flow: Flow): Promise<Walk> {
  await page.goto(flow.url);
  const walk = new Walk(page);
  const start = page.getByTestId("run-start");
  await expect(start).toBeVisible();
  await ready(page, start);
  await scrollDraftControlToView(page, start);
  await walk.tap("Start run", start);

  const header = page.getByTestId("round-header");
  const candidate = page.locator('[data-testid^="candidate-"]').first();
  const emptySlot = page
    .locator('[data-testid^="slot-"][data-filled="false"]:not([disabled])')
    .first();
  for (let round = 1; round <= 16; round++) {
    await expect(header).toContainText(`Round ${round} of 16`);
    await expect(candidate).toBeVisible();
    await scrollDraftControlToView(page, candidate);
    if (flow.pickCandidate) await walk.tap(`round ${round} pick a candidate`, candidate);
    else {
      await walk.see(`round ${round} the offered player`, candidate);
      await expect(candidate).toHaveAttribute("aria-pressed", "true");
      const minimize = page.getByRole("button", { name: "Hide players" });
      await scrollDraftControlToView(page, minimize);
      await walk.tap(`round ${round} acknowledge player and read pitch`, minimize);
    }
    await scrollDraftControlToView(page, emptySlot);
    await walk.tap(`round ${round} place in an empty slot`, emptySlot);
  }

  const seeResults = page.getByTestId("see-results");
  await expect(seeResults).toBeVisible();
  await scrollDraftControlToView(page, seeResults);
  await walk.tap("See results", seeResults);
  await expect(page.getByTestId("results-record")).toBeVisible();
  if (flow.record !== null)
    await expect(page.getByTestId("results-record")).toHaveText(flow.record);
  return walk;
}

test("1 flow: 8-0 Challenge Classic, start to results with scroll and real taps", async ({
  page,
}) => {
  const walk = await playFlow(page, { url: PLAY_8_0, pickCandidate: true, record: RECORD_8_0 });
  conclude("1 flow: 8-0 Challenge Classic", walk.problems());
});

test("1 flow: 151 Challenge, start to results with scroll and real taps", async ({ page }) => {
  const walk = await playFlow(page, { url: PLAY_151, pickCandidate: false, record: RECORD_151 });
  conclude("1 flow: 151 Challenge", walk.problems());
});

test("1 flow: Daily, start to results with scroll and real taps", async ({ page }) => {
  const walk = await playFlow(page, { url: DAILY, pickCandidate: true, record: null });
  await expect(page.getByTestId("submit-panel")).toBeVisible();
  conclude("1 flow: Daily", walk.problems());
});

// ---------------------------------------------------------------------------------------------
// Group 2. No sideways overflow. html and body clip it, so the right edge of every element is
// measured as well as scrollWidth.

const OVERFLOW_WIDTHS = [320, 360, 390, 430] as const;
const SCHEMES: readonly Scheme[] = ["dark", "light"];

for (const scene of SCENES) {
  test(`2 overflow: ${scene.id}`, async ({ page }) => {
    await scene.open(page);
    const lines: string[] = [];
    let measurements = 0;
    let tightest = { spare: Infinity, at: "" };
    // Boxes that scroll sideways inside themselves are reported, never asserted: the page is not wider.
    const scrolling = new Map<string, Map<number, string>>();
    const fingerprints = new Map<Scheme, string>();
    for (const scheme of SCHEMES) {
      fingerprints.set(scheme, await setColorScheme(page, scheme));
      for (const width of OVERFLOW_WIDTHS) {
        await resizeTo(page, { width, height: 800 });
        measurements++;
        const extent = await horizontalExtent(page);
        if (width - extent.right < tightest.spare)
          tightest = { spare: width - extent.right, at: `${scheme} ${width}px` };
        if (extent.right > width || extent.scrollWidth > width) {
          lines.push(
            `${scene.route} ${scheme} ${width}px: widest right edge ${round1(extent.right)}, documentElement.scrollWidth ${extent.scrollWidth}; ${extent.widest}`,
          );
        }
        for (const scroller of extent.scrollers) {
          const widths = scrolling.get(scroller.name) ?? new Map<number, string>();
          if (!widths.has(width))
            widths.set(width, `${scroller.scrollWidth}px of content in ${scroller.clientWidth}px`);
          scrolling.set(scroller.name, widths);
        }
      }
    }
    // Guard against a harness that measured one theme twice.
    expect(fingerprints.get("dark")).not.toBe(fingerprints.get("light"));
    note(
      "overflow",
      `${measurements} measurements; the tightest fit is ${tightest.spare.toFixed(3)}px spare at ${tightest.at}`,
    );
    for (const [name, widths] of scrolling) {
      note(
        "inner scroll",
        `${name} scrolls sideways inside itself at ${[...widths].map(([w, text]) => `${w}px (${text})`).join(", ")}`,
      );
    }

    conclude(
      `2 overflow: ${scene.id}`,
      lines.length === 0
        ? []
        : [
            `${lines.length} of ${measurements} measurements overflow. First: ${lines[0]}`,
            ...lines,
          ],
    );
  });
}

// ---------------------------------------------------------------------------------------------
// Group 3. Every interactive element is at least 44 by 44 CSS px, measured on its own box. A
// pseudo-element hit area is not counted (the repo has none) and there is no allowlist. Links
// inside a sentence are tagged "[inline link]" so the owner can decide about them.

const TARGET_WIDTHS = [390, 320] as const;

function describeTarget(t: TargetInfo): string {
  const tag = t.inlineLink ? " [inline link]" : "";
  return `${t.selector} "${t.text}" ${round1(t.width)}x${round1(t.height)}${tag}`;
}

for (const scene of SCENES) {
  test(`3 targets: ${scene.id}`, async ({ page }) => {
    await scene.open(page);
    const blocks: string[] = [];
    const seen = new Map<string, string>();
    let first: { where: string; total: number; small: TargetInfo[] } | null = null;
    for (const scheme of SCHEMES) {
      await setColorScheme(page, scheme);
      for (const width of TARGET_WIDTHS) {
        await resizeTo(page, { width, height: 800 });
        const targets = await interactiveTargets(page);
        const small = undersized(targets);
        if (small.length === 0) continue;
        const where = `${scheme} ${width}px`;
        first ??= { where, total: targets.length, small };
        const lines = small.map(describeTarget);
        const key = lines.join("\n");
        const same = seen.get(key);
        if (same !== undefined) {
          blocks.push(`${scene.route} ${where}: the same ${small.length} elements as at ${same}`);
          continue;
        }
        seen.set(key, where);
        blocks.push(
          `${scene.route} ${where}: ${small.length} of ${targets.length} interactive elements are under 44x44`,
          ...lines.map((line) => `  ${line}`),
        );
      }
    }
    conclude(
      `3 targets: ${scene.id}`,
      first === null
        ? []
        : [
            `${first.small.length} of ${first.total} interactive elements are under 44x44 at ${first.where}. First: ${describeTarget(first.small[0])}`,
            ...blocks,
          ],
    );
  });
}

// ---------------------------------------------------------------------------------------------
// Group 4. The builder's picker sheet.

const STARTER = "slot-s6";

/** A previous history entry exists, so the browser Back button has somewhere to go. */
async function openPicker(page: Page): Promise<Locator> {
  await page.goto("/how-to-play");
  await page.goto("/");
  const slot = page.getByTestId(STARTER);
  await ready(page, slot);
  // Reaching the pitch is the player's scroll and not what is under test. The tap itself is real.
  await slot.scrollIntoViewIfNeeded();
  await tapNow(page, slot, `pitch slot ${STARTER}`);
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await settle(page);
  return dialog;
}

async function closedWithin(dialog: Locator): Promise<boolean> {
  try {
    await expect(dialog).toHaveCount(0, { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}

test("4 picker: a slot tap opens a sheet whose list scrolls on its own and not the page behind it (real touch on pixel-7, scrollTop write on WebKit)", async ({
  page,
}) => {
  const dialog = await openPicker(page);
  const list = dialog.getByRole("list", { name: "Species" });
  const problems: string[] = [];

  const sizes = await list.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollTop: el.scrollTop,
  }));
  expect(sizes.scrollHeight, "the species list must have more rows than fit").toBeGreaterThan(
    sizes.clientHeight,
  );

  const pageBefore = await page.evaluate(() => window.scrollY);
  // A page that cannot scroll further would hide a chained scroll, so the check needs room.
  const room = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
  );
  expect(room, "harness: the page behind the sheet needs room to scroll").toBeGreaterThan(200);
  if (isChromium(page)) {
    const box = (await list.boundingBox())!;
    const viewport = page.viewportSize()!;
    const at = {
      x: box.x + box.width / 2,
      y: Math.min(box.y + box.height / 2, viewport.height - 60),
    };
    await touchScroll(page, at, 240);
    const moved = await settledScrollTop(list);
    if (moved <= sizes.scrollTop + 20) {
      problems.push(`a swipe on the list moved its scrollTop from ${sizes.scrollTop} to ${moved}`);
    }
    if ((await settledScrollY(page)) !== pageBefore) {
      problems.push(
        `the page behind the sheet scrolled to ${await page.evaluate(() => window.scrollY)}`,
      );
    }

    // At the end of the list a swipe must not chain into the page behind the sheet.
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await touchScroll(page, at, 240);
    const chained = await settledScrollY(page);
    if (chained !== pageBefore) {
      problems.push(
        `a swipe past the end of the list scrolled the page behind the sheet from ${pageBefore} to ${chained}`,
      );
    }
  } else {
    // No touch or wheel API in mobile WebKit: write scrollTop. It shows the list is its own
    // scroll container and that the page stayed put, not that a finger gesture is routed to it.
    notRun("real touch scroll of the picker list on WebKit: no API (scrollTop was written)");
    await list.evaluate((el) => {
      el.scrollTop = 300;
    });
    const moved = await settledScrollTop(list);
    if (moved <= sizes.scrollTop) problems.push(`writing scrollTop left it at ${moved}`);
    if ((await page.evaluate(() => window.scrollY)) !== pageBefore) {
      problems.push("the page behind the sheet scrolled");
    }
  }
  conclude("4 picker: its own scrollable list", problems);
});

test("4 picker: closes on a swipe down on its header (real touch on pixel-7, mouse Pointer Events only on WebKit)", async ({
  page,
}) => {
  const dialog = await openPicker(page);
  const header = dialog.getByRole("heading", { name: /^Pick for/ });
  const box = (await header.boundingBox())!;
  const from = centre(box);
  const method = await drag(page, from, { x: from.x, y: from.y + 240 });
  const closed = await closedWithin(dialog);
  note("swipe", `closing swipe ran as a ${method} drag`);
  conclude(
    "4 picker: swipe down on the header",
    closed
      ? []
      : [
          `the sheet is still open after a ${method} swipe down 240px from its header (${describeBox(box)})`,
        ],
  );
});

test("4 picker: closes on the browser Back button and the page stays on the builder", async ({
  page,
}) => {
  const dialog = await openPicker(page);
  await page.goBack();
  await settle(page);
  const problems: string[] = [];
  const { pathname } = new URL(page.url());
  if (pathname !== "/") problems.push(`Back left the builder: the URL is now ${pathname}`);
  if ((await dialog.count()) > 0) problems.push("the sheet is still open after Back");
  conclude("4 picker: browser Back", problems.length === 0 ? [] : [problems.join("; ")]);
});

test("4 picker: closes on its close button", async ({ page }) => {
  const dialog = await openPicker(page);
  const problems: string[] = [];
  try {
    await tapNow(page, dialog.getByRole("button", { name: "Close picker" }), "Close picker");
  } catch (error) {
    if (!(error instanceof ReachError)) throw error;
    problems.push(error.oneLine());
  }
  if (problems.length === 0 && !(await closedWithin(dialog))) {
    problems.push("the sheet is still open after a tap on Close");
  }
  conclude("4 picker: close button", problems);
});

test("4 picker: focus returns to the tapped slot when it closes", async ({ page }) => {
  const dialog = await openPicker(page);
  await tapNow(page, dialog.getByRole("button", { name: "Close picker" }), "Close picker");
  await expect(dialog).toHaveCount(0);
  await settle(page);
  const focused = await page.evaluate(
    () =>
      document.activeElement?.getAttribute("data-testid") ??
      document.activeElement?.tagName.toLowerCase() ??
      "nothing",
  );
  conclude(
    "4 picker: focus return",
    focused === STARTER
      ? []
      : [
          `after the sheet closed, focus is on <${focused}> and not on the tapped slot ${STARTER} (iOS Safari does not focus a tapped button, so the page has to restore focus itself)`,
        ],
  );
});

// ---------------------------------------------------------------------------------------------
// Group 5. Drag to swap, and page scroll outside the pitch.

function speciesOf(label: string): string {
  const match = /^(?:SUB \d+|[A-Z0-9]+) (.+)$/.exec(label);
  if (match === null)
    throw new Error(`harness: cannot read a species from the token label "${label}"`);
  return match[1];
}

async function filledBuilder(page: Page): Promise<void> {
  await page.goto("/");
  const randomize = page.getByRole("button", { name: "Randomize" });
  await ready(page, randomize);
  await randomize.click();
  await expect(page.locator('[data-testid^="slot-"][data-filled="true"]')).toHaveCount(16);
  await settle(page);
}

test("5 drag and scroll: a drag swaps two tokens (real touch on pixel-7, mouse Pointer Events only on WebKit)", async ({
  page,
}) => {
  await filledBuilder(page);
  const a = page.getByTestId("slot-s6");
  const b = page.getByTestId("slot-s7");
  await page.getByTestId("pitch").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await settle(page);
  for (const token of [a, b]) {
    const check = await inViewport(page, token);
    if (!check.ok) throw new Error(`harness: a token to drag is not on screen: ${check.problem}`);
  }
  const before = [
    speciesOf((await a.getAttribute("aria-label"))!),
    speciesOf((await b.getAttribute("aria-label"))!),
  ];
  expect(before[0]).not.toBe(before[1]);

  const method = await drag(
    page,
    centre((await a.boundingBox())!),
    centre((await b.boundingBox())!),
  );

  const read = async () => [
    speciesOf((await a.getAttribute("aria-label"))!),
    speciesOf((await b.getAttribute("aria-label"))!),
  ];
  let after = await read();
  try {
    await expect.poll(read, { timeout: 3_000 }).toEqual([before[1], before[0]]);
    after = [before[1], before[0]];
  } catch {
    after = await read();
  }
  conclude(
    `5 drag and scroll: swap (${method} drag)`,
    after[0] === before[1] && after[1] === before[0]
      ? []
      : [
          `the tokens did not swap after a ${method} drag. s6 held ${before[0]} and now holds ${after[0]}, s7 held ${before[1]} and now holds ${after[1]}`,
        ],
  );
});

test("5 drag and scroll: a vertical swipe that starts outside the pitch scrolls the page (real touch on pixel-7, CSS and scrollBy on WebKit)", async ({
  page,
}) => {
  await filledBuilder(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  const heading = page.getByRole("heading", { name: "Play", exact: true });
  const check = await inViewport(page, heading);
  if (!check.ok)
    throw new Error(`harness: the heading to swipe from is not on screen: ${check.problem}`);

  const problems: string[] = [];
  if (isChromium(page)) {
    await touchScroll(page, centre(check.box!), 240);
    const scrolled = await settledScrollY(page);
    if (scrolled < 100)
      problems.push(`a 240px swipe from the heading scrolled the page only ${scrolled}px`);
  } else {
    // No touch scroll in mobile WebKit. This reads CSS: a swipe that starts here is allowed to
    // pan, and the page can scroll. It does not show that a finger gesture scrolled it.
    notRun("real touch scroll on WebKit: no API (touch-action and scrollability were read)");
    if (!(await panYAllowed(heading)))
      problems.push("touch-action forbids vertical panning at the heading");
    await page.evaluate(() => window.scrollBy(0, 240));
    if ((await page.evaluate(() => window.scrollY)) < 100)
      problems.push("the page does not scroll");
  }
  conclude("5 drag and scroll: swipe outside the pitch", problems);
});

/** A point on the field's grass that no token covers, low on the field and still on screen. */
async function grassPoint(page: Page, field: Locator): Promise<{ x: number; y: number }> {
  const at = await field.evaluate((el, height) => {
    const box = el.getBoundingClientRect();
    for (let fy = 0.75; fy >= 0.3; fy -= 0.05) {
      for (const fx of [0.5, 0.25, 0.75, 0.15, 0.85]) {
        const x = box.left + box.width * fx;
        const y = Math.min(box.top + box.height * fy, height - 80);
        if (document.elementFromPoint(x, y) === el) return { x, y };
      }
    }
    return null;
  }, page.viewportSize()!.height);
  if (at === null) throw new Error("harness: no bare grass on the field to swipe from");
  return at;
}

test("5 drag and scroll: a vertical swipe that starts on the pitch's grass scrolls the page (real touch on pixel-7, CSS read on WebKit)", async ({
  page,
}) => {
  await filledBuilder(page);
  const field = page.getByRole("group", { name: /lineup$/ }).first();
  await field.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await settle(page);
  const problems: string[] = [];
  if (isChromium(page)) {
    const at = await grassPoint(page, field);
    const start = await page.evaluate(() => window.scrollY);
    await touchScroll(page, at, 160);
    const moved = (await settledScrollY(page)) - start;
    if (moved < 100)
      problems.push(
        `a 160px swipe that starts on the grass at ${Math.round(at.x)},${Math.round(at.y)} scrolled the page ${Math.round(moved)}px`,
      );
  } else {
    notRun("real touch swipe on the pitch on WebKit: no API (touch-action was read)");
    if (!(await panYAllowed(field)))
      problems.push(
        "touch-action on the pitch forbids vertical panning, so a swipe on it cannot scroll",
      );
  }
  conclude("5 drag and scroll: swipe on the pitch", problems);
});

test("5 drag and scroll: after a touch drag, the next tap on a slot still opens the Picker (real touch on pixel-7)", async ({
  page,
}) => {
  test.skip(
    !isChromium(page),
    "WebKit has no touch drag API; the jsdom test in Pitch.test.tsx covers the click rule",
  );
  await filledBuilder(page);
  await page.getByTestId("pitch").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await settle(page);
  const a = page.getByTestId("slot-s6");
  const b = page.getByTestId("slot-s7");
  await touchDrag(page, centre((await a.boundingBox())!), centre((await b.boundingBox())!));
  await settle(page);
  await tapNow(page, page.getByTestId("slot-s9"), "slot-s9 after the drag");
  const opened = await page
    .locator("dialog[open]")
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  conclude(
    "5 drag and scroll: tap after a touch drag",
    opened ? [] : ["the first tap on a slot after a touch drag did not open the Picker"],
  );
});

test("5 drag and scroll: on the finished draft, a tap on one player and then another swaps them (real taps)", async ({
  page,
}) => {
  await page.goto(PLAY_8_0);
  const go = page.getByTestId("run-start");
  await ready(page, go);
  await go.click();
  await draftRounds(page, 16);
  await expect(page.getByTestId("see-results")).toBeVisible();
  await settle(page);
  const gk = page.getByTestId("slot-s0");
  const lf = page.getByTestId("slot-s9");
  const before = [
    speciesOf((await gk.getAttribute("aria-label"))!),
    speciesOf((await lf.getAttribute("aria-label"))!),
  ];
  await scrollDraftControlToView(page, gk);
  await tapNow(page, gk, "slot-s0");
  await scrollDraftControlToView(page, lf);
  await tapNow(page, lf, "slot-s9");
  const read = async () => [
    speciesOf((await gk.getAttribute("aria-label"))!),
    speciesOf((await lf.getAttribute("aria-label"))!),
  ];
  let after = await read();
  try {
    await expect.poll(read, { timeout: 3_000 }).toEqual([before[1], before[0]]);
    after = [before[1], before[0]];
  } catch {
    after = await read();
  }
  conclude(
    "5 drag and scroll: tap swap",
    after[0] === before[1] && after[1] === before[0]
      ? []
      : [
          `two taps did not swap the players. s0 held ${before[0]} and now holds ${after[0]}, s9 held ${before[1]} and now holds ${after[1]}`,
        ],
  );
});

// ---------------------------------------------------------------------------------------------
// Group 6. The nickname field and the on-screen keyboard.

test("6 keyboard: the focused nickname input stays fully visible when the viewport shrinks to 55%", async ({
  page,
}) => {
  await page.goto(DAILY);
  const start = page.getByTestId("run-start");
  await ready(page, start);
  await start.click();
  await draftRounds(page, 16);
  await page.getByTestId("see-results").click();
  const input = page.getByTestId("submit-nickname");
  await expect(input).toBeVisible();
  await settle(page);

  // The player scrolls to the field and taps it.
  await input.scrollIntoViewIfNeeded();
  await tapNow(page, input, "nickname input");
  await expect.poll(() => input.evaluate((el) => el === document.activeElement)).toBe(true);

  // The keyboard takes the lower part of the screen. Safari and Chrome then scroll the focused
  // field into view, which scrollIntoView stands in for.
  const full = page.viewportSize()!;
  await page.setViewportSize({ width: full.width, height: Math.round(full.height * 0.55) });
  await input.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await settle(page);
  notRun("real iOS keyboard: a headless viewport shrink is only an approximation");

  const problems: string[] = [];
  const field = await inViewport(page, input);
  if (!field.ok) problems.push(`the input: ${field.problem}`);

  const submit = page.getByTestId("submit-button");
  let scrolls = 0;
  let reachable = (await inViewport(page, submit)).ok;
  if (!reachable) {
    scrolls = 1;
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.8)));
    await settle(page);
    reachable = (await inViewport(page, submit)).ok;
  }
  note(
    "keyboard",
    reachable
      ? `the submit button needs ${scrolls} scroll${scrolls === 1 ? "" : "s"} (shrunk viewport ${full.width}x${page.viewportSize()!.height})`
      : `the submit button is not reachable with one scroll (shrunk viewport ${full.width}x${page.viewportSize()!.height})`,
  );
  if (!reachable) problems.push("the submit button is not reachable with one scroll");
  conclude("6 keyboard: nickname input", problems.length === 0 ? [] : [problems.join("; ")]);
});

// ---------------------------------------------------------------------------------------------
// Group 7. iPhone 14 on its side. 844x390 is the screen, 750x340 is Playwright's landscape
// viewport with the browser bars taken off.

const LANDSCAPES = [
  { width: 844, height: 390 },
  { width: 750, height: 340 },
] as const;

for (const scene of SCENES) {
  test(`7 landscape: ${scene.id}`, async ({ page }) => {
    test.skip(
      test.info().project.name !== "iphone-14",
      "landscape is specified for iPhone 14 only, so the other phone projects skip it",
    );
    await scene.open(page);
    const lines: string[] = [];
    for (const size of LANDSCAPES) {
      const at = `${scene.route} ${size.width}x${size.height}`;
      await resizeTo(page, size);

      const extent = await horizontalExtent(page);
      if (extent.right > size.width || extent.scrollWidth > size.width) {
        lines.push(
          `${at}: horizontal overflow, widest right edge ${round1(extent.right)}, scrollWidth ${extent.scrollWidth}; ${extent.widest}`,
        );
      }

      const primary = scene.primary(page);
      if ((await primary.count()) === 0) {
        lines.push(`${at}: the primary action does not exist`);
      } else {
        await primary.first().scrollIntoViewIfNeeded();
        await settle(page);
        const check = await inViewport(page, primary);
        if (!check.ok) {
          lines.push(
            `${at}: the primary action is not reachable after scrolling it into view: ${check.problem} (${check.box ? describeBox(check.box) : "no box"})`,
          );
        }
      }

      if (scene.modal !== true) {
        const reach = await pageScrollReach(page);
        if (
          reach.scrollHeight > reach.clientHeight + 1 &&
          (reach.viewportOverflowY === "hidden" || reach.viewportOverflowY === "clip")
        ) {
          lines.push(
            `${at}: the content is taller than the screen (scrollHeight ${reach.scrollHeight}, clientHeight ${reach.clientHeight}) but html and body hide vertical overflow (overflow-y ${reach.viewportOverflowY}), so a player cannot scroll`,
          );
        } else if (reach.contentBottom > reach.reachableBottom + 1) {
          lines.push(
            `${at}: content reaches y=${Math.round(reach.contentBottom)} but the page scrolls only to ${Math.round(reach.reachableBottom)} (scrollHeight ${reach.scrollHeight}, clientHeight ${reach.clientHeight})`,
          );
        } else if (reach.scrollHeight > reach.clientHeight + 1 && reach.scrolledTo === 0) {
          lines.push(
            `${at}: scrollHeight ${reach.scrollHeight} exceeds clientHeight ${reach.clientHeight} but the page does not scroll`,
          );
        }
      }

      for (const clipped of await clippedText(page))
        lines.push(`${at}: text clipped away, ${clipped}`);
    }
    conclude(
      `7 landscape: ${scene.id}`,
      lines.length === 0 ? [] : [`${lines.length} problems. First: ${lines[0]}`, ...lines],
    );
  });
}
