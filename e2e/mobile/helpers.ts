import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

export function describeBox(box: Box): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  return `x=${r(box.x)} y=${r(box.y)} w=${r(box.width)} h=${r(box.height)} (spans y ${r(box.y)} to ${r(box.y + box.height)})`;
}

export function centre(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Records something a run could not exercise, so the report and the HTML report show it. */
export function notRun(description: string): void {
  const { annotations } = test.info();
  if (!annotations.some((a) => a.type === "NOT RUN" && a.description === description)) {
    annotations.push({ type: "NOT RUN", description });
  }
}

export function note(type: string, description: string): void {
  test.info().annotations.push({ type, description });
}

export function nextFrame(page: Page): Promise<void> {
  return page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}

/**
 * Brings the page to rest before a measurement. Without it a measurement can land on the first
 * frame of an entrance animation (a dialog opens 16px low, candidates slide in 14px low) or on the
 * start value of a colour transition.
 *
 * It waits for one rendering update, because that is where a resize event, a media query change
 * and a ResizeObserver callback run. Then it jumps every finite animation to its end state with
 * `Animation.finish()` and gives the handlers that start (React's scheduled work, `transitionend`)
 * a turn, until none is left. It never waits for a second frame and never awaits
 * `Animation.finished`, which Chromium leaves pending for a transition that ends between frames.
 * Waiting out the frames cost far more than it proved: WebKit on Linux paints each frame in
 * software, a frame after a layout change took 100 to 300 ms there, and the suite spent most of its
 * time in that wait. A layout read forces the layout the measurement needs, so the paint is not.
 * The pass cap keeps an animation that restarts itself from hanging a test.
 */
export function settle(page: Page): Promise<void> {
  return bringToRest(page, true);
}

/**
 * `settle` without the rendering update, for the moment after a tap or a click. React has already
 * committed the change, because a discrete event is flushed before its dispatch returns, and
 * `getAnimations()` makes the browser resolve style, so the animations the change started exist and
 * can be finished. One task turn first lets the passive effects of that commit run. Use `settle`
 * after a resize, a colour scheme change or a navigation: those reach the page in a rendering update.
 */
export function settleNow(page: Page): Promise<void> {
  return bringToRest(page, false);
}

async function bringToRest(page: Page, renderingUpdate: boolean): Promise<void> {
  await page.evaluate(async (frame) => {
    const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (frame) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    else await turn();
    for (let pass = 0; pass < 50; pass++) {
      const live = document
        .getAnimations()
        .filter(
          (a) =>
            a.effect?.getComputedTiming().iterations !== Infinity &&
            (a.playState === "running" || a.pending),
        );
      if (live.length === 0) break;
      for (const animation of live) {
        try {
          animation.finish();
        } catch {
          // An animation that cannot be finished (a negative rate with no start) is left alone.
        }
      }
      await turn();
    }
    void document.documentElement.offsetWidth;
  }, renderingUpdate);
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Resizes the viewport and waits until the page has laid out at that size, so a measurement cannot
 * run against the old width. Mobile emulation keeps a device width in some engines, which would
 * turn every overflow check into a check of one width.
 */
export async function resizeTo(page: Page, size: Size): Promise<void> {
  await page.setViewportSize(size);
  await expect
    .poll(() => page.evaluate(() => [document.documentElement.clientWidth, window.innerHeight]), {
      message: `the page did not lay out at ${size.width}x${size.height}`,
    })
    .toEqual([size.width, size.height]);
  await settle(page);
}

// Hydration is a precondition, not a measurement. A browser launched cold inside a test, next to
// three other CPU-bound workers, has needed more than expect.poll's 5 s default (hosted runs
// 38783031946, 38825262768, 38841517775 and 38918007179), so wait for the event itself.
const HYDRATION_TIMEOUT_MS = 30_000;

/** A server-rendered element is only live once React has attached its props to it. */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect
    .poll(
      () =>
        locator
          .first()
          .evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$"))),
      { message: "React did not hydrate the element", timeout: HYDRATION_TIMEOUT_MS },
    )
    .toBe(true);
}

/** window.scrollY once it has held still for a few frames (a touch fling keeps scrolling). */
export function settledScrollY(page: Page): Promise<number> {
  return page.evaluate(async () => {
    let last = -1;
    let same = 0;
    for (let frames = 0; frames < 300 && same < 4; frames++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      same = window.scrollY === last ? same + 1 : 0;
      last = window.scrollY;
    }
    return last;
  });
}

export function settledScrollTop(locator: Locator): Promise<number> {
  return locator.first().evaluate(async (el) => {
    let last = -1;
    let same = 0;
    for (let frames = 0; frames < 300 && same < 4; frames++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      same = el.scrollTop === last ? same + 1 : 0;
      last = el.scrollTop;
    }
    return last;
  });
}

// ---------------------------------------------------------------------------------------------
// Reach: is a control on screen, uncovered, and tappable without moving the page?

export interface ViewportCheck {
  readonly ok: boolean;
  /** Why the check failed, or null when it passed. */
  readonly problem: string | null;
  readonly box: Box | null;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly offsetLeft: number;
    readonly offsetTop: number;
    readonly scrollY: number;
  };
  readonly coveredBy: string | null;
}

/**
 * True when the element lies fully inside `window.visualViewport` and the element found at its
 * centre point by `document.elementFromPoint` is the element or one of its descendants, so a
 * sticky bar, toast or sheet on top of it fails the check. Never scrolls.
 */
export async function inViewport(page: Page, locator: Locator): Promise<ViewportCheck> {
  void page;
  return locator.first().evaluate((el): ViewportCheck => {
    const vv = window.visualViewport;
    const viewport = {
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
      offsetLeft: vv?.offsetLeft ?? 0,
      offsetTop: vv?.offsetTop ?? 0,
      scrollY: window.scrollY,
    };
    const r = el.getBoundingClientRect();
    const box = { x: r.x, y: r.y, width: r.width, height: r.height };
    const name = (node: Element | null): string => {
      if (node === null) return "nothing (the point is outside the viewport)";
      const id = node.getAttribute("data-testid");
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
      return `<${node.tagName.toLowerCase()}${id ? ` data-testid=${id}` : ""}>${text ? ` "${text}"` : ""}`;
    };
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") {
      return {
        ok: false,
        problem: "the element is not rendered (zero size or hidden)",
        box,
        viewport,
        coveredBy: null,
      };
    }
    const eps = 0.5;
    const inside =
      r.left >= viewport.offsetLeft - eps &&
      r.top >= viewport.offsetTop - eps &&
      r.right <= viewport.offsetLeft + viewport.width + eps &&
      r.bottom <= viewport.offsetTop + viewport.height + eps;
    if (!inside) {
      return {
        ok: false,
        problem: "the element is not fully inside the visual viewport",
        box,
        viewport,
        coveredBy: null,
      };
    }
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top === null || !el.contains(top)) {
      return {
        ok: false,
        problem: `the element is covered at its centre by ${name(top)}`,
        box,
        viewport,
        coveredBy: name(top),
      };
    }
    return { ok: true, problem: null, box, viewport, coveredBy: null };
  });
}

function viewportReport(check: ViewportCheck): string {
  const v = check.viewport;
  return [
    check.box ? `  element: ${describeBox(check.box)}` : "  element: (no box)",
    `  visual viewport: ${Math.round(v.width)}x${Math.round(v.height)} at offset (${Math.round(v.offsetLeft)},${Math.round(v.offsetTop)}), window.scrollY=${Math.round(v.scrollY)}`,
  ].join("\n");
}

async function tapCentre(page: Page, check: ViewportCheck): Promise<void> {
  const at = centre(check.box!);
  await page.touchscreen.tap(at.x, at.y);
}

/**
 * A tap precondition failed: the control is off screen, covered, or the page moved. This is a
 * verdict about the app. Any other error from these helpers is a harness fault and must not be
 * mistaken for it.
 */
export class ReachError extends Error {
  constructor(
    readonly label: string,
    readonly problems: readonly string[],
    readonly check: ViewportCheck,
  ) {
    super(`tap "${label}": ${problems.join("; ")}\n${viewportReport(check)}`);
    this.name = "ReachError";
  }

  /** The same facts on one line, for lists of failed steps. */
  oneLine(): string {
    const { box, viewport } = this.check;
    const where = box
      ? `element spans y ${Math.round(box.y)} to ${Math.round(box.y + box.height)}`
      : "element has no box";
    return `${this.label}: ${this.problems.join("; ")} (${where}, viewport ${Math.round(viewport.width)}x${Math.round(viewport.height)}, scrollY ${Math.round(viewport.scrollY)})`;
  }
}

/**
 * Taps an element that is on screen and uncovered, with a real touch at its centre. It never calls
 * `locator.tap()` and never scrolls: Playwright's own scroll-into-view would hide the defect.
 * Unlike `tapInView` it allows the page to have moved since the last step, so it suits setup steps
 * the test reaches by scrolling on purpose.
 */
export async function tapNow(page: Page, locator: Locator, label: string): Promise<void> {
  await locator.first().waitFor({ state: "visible" });
  await settleNow(page);
  const check = await inViewport(page, locator);
  if (!check.ok) throw new ReachError(label, [check.problem!], check);
  await tapCentre(page, check);
}

const scrollBaselines = new WeakMap<Page, number>();

/** Forget the scroll position the next `tapInView` compares against (after a navigation). */
export function resetScrollBaseline(page: Page): void {
  scrollBaselines.delete(page);
}

/**
 * The reach verdict for one step of a flow, without tapping. Fails when the element is not fully on
 * screen and uncovered, or when `window.scrollY` differs from the previous step. On success it
 * remembers the scroll position for the next step.
 */
export async function reachInView(
  page: Page,
  locator: Locator,
  label: string,
): Promise<ViewportCheck> {
  await locator.first().waitFor({ state: "visible" });
  await settleNow(page);
  const check = await inViewport(page, locator);
  const before = scrollBaselines.get(page);
  const problems: string[] = [];
  if (!check.ok) problems.push(check.problem!);
  if (before !== undefined && Math.abs(check.viewport.scrollY - before) > 0.5) {
    problems.push(
      `the page scrolled from ${Math.round(before)} to ${Math.round(check.viewport.scrollY)} since the previous step`,
    );
  }
  if (problems.length > 0) throw new ReachError(label, problems, check);
  scrollBaselines.set(page, check.viewport.scrollY);
  return check;
}

/**
 * One step of a tap-only flow: `reachInView`, then a real touch at the element centre. It never
 * calls `locator.tap()` and never scrolls, so a control the player would have to scroll to fails.
 */
export async function tapInView(page: Page, locator: Locator, label: string): Promise<void> {
  const check = await reachInView(page, locator, label);
  await tapCentre(page, check);
}

/**
 * What a player does with a control that is off screen: scrolls it to the middle of the screen and
 * taps it. A walk uses it after a step has been judged, to carry on from where the player would be.
 * If the control is still not on screen and uncovered after the scroll (a fixed bar over it), it
 * falls back to Playwright's own `locator.tap()`, which tries harder.
 */
export async function scrollThenTap(page: Page, locator: Locator): Promise<void> {
  await locator
    .first()
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }),
    );
  await settleNow(page);
  const check = await inViewport(page, locator);
  if (check.ok) await tapCentre(page, check);
  else await locator.first().tap({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------------------------
// Overflow

export interface Scroller {
  /** The box that scrolls sideways, named like the other messages name an element. */
  readonly name: string;
  readonly clientWidth: number;
  readonly scrollWidth: number;
}

export interface HorizontalExtent {
  /** The right edge of the widest element the player can see, in CSS px. */
  readonly right: number;
  /** `documentElement.scrollWidth`, which html and body can hide. */
  readonly scrollWidth: number;
  /** The element that sets `right`, for the message that explains an overflow. */
  readonly widest: string;
  /** Boxes that scroll sideways inside themselves, such as a table in its own wrapper. */
  readonly scrollers: readonly Scroller[];
}

/**
 * How far right the page reaches. html and body clip sideways overflow, so `scrollWidth` alone
 * hides a clipped header or button: the right edge of every element is measured as well.
 *
 * An element inside a box the player can scroll sideways (`overflow-x: auto` or `scroll`, between
 * the element and body) counts only up to that box. A wide table in its own scroller does not make
 * the page wider, and the player reaches the rest by scrolling it. Such scrollers are returned in
 * `scrollers`, so a test can report them. Content cut off by `overflow: hidden` or `clip` gets no
 * such allowance, because the player cannot reach it, and neither does a positioned element
 * (absolute or fixed), whose clipping depends on its containing block.
 *
 * `checkVisibility()` is false for `display:none` and for the contents of a closed `<details>`,
 * which WebKit still lays out when asked.
 */
export function horizontalExtent(page: Page): Promise<HorizontalExtent> {
  return page.evaluate((): HorizontalExtent => {
    const scrolls = (value: string) => value === "auto" || value === "scroll";
    const tag = (el: Element) => {
      const id = el.getAttribute("data-testid");
      const cls = [...el.classList].slice(0, 1).join(".");
      return `${el.tagName.toLowerCase()}${id ? `[testid=${id}]` : ""}${cls ? `.${cls}` : ""}`;
    };
    // The right edge of the nearest scroller at or above `el`, then the next one up, and so on.
    const limits = new Map<Element, number>();
    const limitAt = (el: Element | null): number => {
      if (el === null || el === document.body || el === document.documentElement) return Infinity;
      const known = limits.get(el);
      if (known !== undefined) return known;
      const own = scrolls(getComputedStyle(el).overflowX)
        ? el.getBoundingClientRect().right
        : Infinity;
      const limit = Math.min(own, limitAt(el.parentElement));
      limits.set(el, limit);
      return limit;
    };

    let best: Element | null = null;
    let right = 0;
    const scrollers: Scroller[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!el.checkVisibility()) continue;
      const style = getComputedStyle(el);
      const positioned = style.position === "absolute" || style.position === "fixed";
      const seen = Math.min(
        el.getBoundingClientRect().right,
        positioned ? Infinity : limitAt(el.parentElement),
      );
      if (seen > right) {
        right = seen;
        best = el;
      }
      if (scrolls(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        scrollers.push({ name: tag(el), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
      }
    }

    let widest = "no element";
    if (best !== null) {
      const text = (best.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
      const parent = best.parentElement ? `${tag(best.parentElement)} > ` : "";
      widest = `${parent}${tag(best)}${text ? ` "${text}"` : ""} reaches x=${Math.round(right)}`;
    }
    return { right, scrollWidth: document.documentElement.scrollWidth, widest, scrollers };
  });
}

export async function widestRight(page: Page): Promise<number> {
  return (await horizontalExtent(page)).right;
}

export function documentScrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

// ---------------------------------------------------------------------------------------------
// Target size

export const MIN_TARGET = 44;

export interface TargetInfo {
  /** Tag plus the attributes that name it, e.g. `button[testid=submit-button]`. */
  readonly selector: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** A link inside a sentence, which WCAG 2.5.8 treats differently. Reported, never exempted. */
  readonly inlineLink: boolean;
}

/**
 * Every visible interactive element with the box of the element itself. Excluded: anything inside
 * `[inert]` or an `aria-hidden` ancestor, `display:none` and `visibility:hidden` elements, the
 * contents of a closed `<details>`, and zero-size boxes. While a modal `<dialog>` is open only its
 * contents are scanned, because the browser makes the page behind it inert. Disabled controls stay
 * in: they have the same size when they are enabled. A pseudo-element hit area is never counted.
 */
export function interactiveTargets(page: Page): Promise<TargetInfo[]> {
  return page.evaluate(() => {
    const modal = document.querySelector("dialog:modal");
    const SELECTOR = [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "summary",
      '[role="button"]',
      '[role="checkbox"]',
      '[role="switch"]',
      '[role="menuitem"]',
      '[role="link"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const hiddenByDetails = (el: Element): boolean => {
      for (
        let d = el.closest("details");
        d !== null;
        d = d.parentElement?.closest("details") ?? null
      ) {
        if (d.open) continue;
        const summary = [...d.children].find((c) => c.tagName === "SUMMARY");
        if (summary === undefined || !summary.contains(el)) return true;
      }
      return false;
    };

    const visible = (el: Element): boolean => {
      if (modal !== null && !modal.contains(el)) return false;
      if (el.closest("[inert]") !== null || el.closest('[aria-hidden="true"]') !== null)
        return false;
      if (hiddenByDetails(el)) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const html = el as HTMLElement;
      if (typeof html.checkVisibility === "function" && !html.checkVisibility()) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const describe = (el: Element): string => {
      const attrs: string[] = [];
      for (const [attr, label] of [
        ["type", "type"],
        ["role", "role"],
        ["data-testid", "testid"],
        ["href", "href"],
      ] as const) {
        const value = el.getAttribute(attr);
        if (value) attrs.push(`${label}=${value}`);
      }
      return `${el.tagName.toLowerCase()}${attrs.length ? `[${attrs.join(" ")}]` : ""}`;
    };

    const labelOf = (el: Element): string => {
      const field = el as HTMLInputElement;
      const labels = [...(field.labels ?? [])].map((l) => l.textContent ?? "").join(" ");
      const own =
        el.tagName === "SELECT"
          ? ((el as HTMLSelectElement).selectedOptions[0]?.text ?? "")
          : (el.textContent?.trim() ?? "");
      const raw =
        el.getAttribute("aria-label") || labels || own || field.placeholder || field.value || "";
      return raw.replace(/\s+/g, " ").trim().slice(0, 40);
    };

    const isInlineLink = (el: Element): boolean => {
      if (el.tagName !== "A" || getComputedStyle(el).display !== "inline") return false;
      let block = el.parentElement;
      while (block !== null && getComputedStyle(block).display === "inline")
        block = block.parentElement;
      const own = (el.textContent ?? "").trim().length;
      return (block?.textContent ?? "").trim().length - own >= 3;
    };

    return [...document.querySelectorAll(SELECTOR)].filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        selector: describe(el),
        text: labelOf(el),
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        inlineLink: isInlineLink(el),
      };
    });
  });
}

export function undersized(targets: readonly TargetInfo[], min = MIN_TARGET): TargetInfo[] {
  return targets.filter((t) => t.width < min - 0.01 || t.height < min - 0.01);
}

// ---------------------------------------------------------------------------------------------
// Gestures

function isChromium(page: Page): boolean {
  return page.context().browser()?.browserType().name() === "chromium";
}

const sessions = new WeakMap<Page, Promise<CDPSession>>();

function cdp(page: Page): Promise<CDPSession> {
  let session = sessions.get(page);
  if (session === undefined) {
    session = page.context().newCDPSession(page);
    sessions.set(page, session);
  }
  return session;
}

/**
 * A real touch drag: CDP `Input.dispatchTouchEvent` touchStart, touchMove steps, touchEnd. The
 * browser turns it into pointer events (pointerType touch) and, where `touch-action` allows,
 * a scroll. Chromium only: WebKit has no CDP, use `pointerDrag` there.
 */
export async function touchDrag(page: Page, from: Point, to: Point, steps = 12): Promise<void> {
  if (!isChromium(page))
    throw new Error("touchDrag needs Chromium (CDP). Use pointerDrag on WebKit.");
  const session = await cdp(page);
  const send = (type: "touchStart" | "touchMove" | "touchEnd", at?: Point) =>
    session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: at === undefined ? [] : [{ x: at.x, y: at.y, id: 1 }],
    });
  await send("touchStart", from);
  for (let i = 1; i <= steps; i++) {
    await send("touchMove", {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    });
    await nextFrame(page);
  }
  // Hold still before lifting so the browser has no fling velocity to keep scrolling with.
  for (let i = 0; i < 3; i++) await nextFrame(page);
  await send("touchEnd");
}

/** A finger swipe that scrolls content down by `distance` CSS px (the finger moves up). Chromium only. */
export function touchScroll(page: Page, at: Point, distance: number): Promise<void> {
  return touchDrag(page, at, { x: at.x, y: at.y - distance });
}

/**
 * A drag with the mouse (down, several moves, up). It runs the app's Pointer Events handlers, which
 * is what `Pitch` and a bottom sheet listen to, but the events carry pointerType "mouse". It is NOT
 * a touch gesture: it proves nothing about touch-action, scroll arbitration or palm rejection.
 * A mouse drag that starts on an <img> begins the browser's native image drag in WebKit, which
 * ends the pointer stream. A finger drag never does that, so the harness cancels `dragstart` to let
 * the mouse stand in for a finger.
 */
export async function pointerDrag(page: Page, from: Point, to: Point, steps = 12): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __cancelNativeDrag?: (e: Event) => void };
    w.__cancelNativeDrag = (e) => e.preventDefault();
    document.addEventListener("dragstart", w.__cancelNativeDrag, true);
  });
  try {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / steps,
        from.y + ((to.y - from.y) * i) / steps,
      );
      await nextFrame(page);
    }
    await nextFrame(page);
    await page.mouse.up();
  } finally {
    await page.evaluate(() => {
      const w = window as unknown as { __cancelNativeDrag?: (e: Event) => void };
      if (w.__cancelNativeDrag)
        document.removeEventListener("dragstart", w.__cancelNativeDrag, true);
    });
  }
}

/**
 * The finger drag for this engine: a real touch drag in Chromium, a mouse drag in WebKit. The
 * WebKit path records a NOT RUN annotation, because mobile WebKit has no touch drag API.
 */
export async function drag(page: Page, from: Point, to: Point): Promise<"touch" | "pointer"> {
  if (isChromium(page)) {
    await touchDrag(page, from, to);
    return "touch";
  }
  notRun("real touch drag on WebKit: no API");
  note(
    "pointerDrag",
    "a mouse drag exercised the Pointer Events handlers (pointerType mouse), not touch",
  );
  await pointerDrag(page, from, to);
  return "pointer";
}

export { isChromium };

// ---------------------------------------------------------------------------------------------
// Touch-action: can a swipe that starts here pan the page?

/**
 * True when no element from `locator` up to the root forbids vertical panning with its computed
 * `touch-action`. It reads CSS, so it works on WebKit where no touch gesture can be sent. It says
 * a swipe is allowed to scroll, not that it did.
 */
export function panYAllowed(locator: Locator): Promise<boolean> {
  return locator.first().evaluate((el) => {
    for (let n: Element | null = el; n !== null; n = n.parentElement) {
      const value = getComputedStyle(n).touchAction;
      if (["none", "pan-x", "pinch-zoom", "pan-x pinch-zoom"].includes(value)) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------------------------
// Environment

/**
 * Safari on iOS does not focus a button or a link when it is tapped. WebKit on Linux does, and so
 * does Chromium (as Chrome on Android does). This capture-phase listener drops that focus before
 * the app's click handler runs. The suite installs it on its WebKit projects only, so they see iOS
 * behaviour on every operating system. Text fields keep their focus.
 */
export const IOS_BUTTON_FOCUS_SCRIPT = `
document.addEventListener(
  "click",
  () => {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      active.matches('button, a[href], summary, [role="button"], [role="switch"], [role="checkbox"]')
    ) {
      active.blur();
    }
  },
  true,
);`;

export async function installIosButtonFocus(page: Page): Promise<void> {
  await page.addInitScript(IOS_BUTTON_FOCUS_SCRIPT);
}

export type Scheme = "dark" | "light";

/**
 * Switches prefers-color-scheme and returns the computed body background and text colour, to show
 * it took effect.
 */
export async function setColorScheme(page: Page, scheme: Scheme): Promise<string> {
  await page.emulateMedia({ colorScheme: scheme });
  await expect
    .poll(() => page.evaluate((s) => matchMedia(`(prefers-color-scheme: ${s})`).matches, scheme))
    .toBe(true);
  // The app transitions its colours, so read them only once the transitions have ended.
  await settle(page);
  return page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return `${style.backgroundColor} ${style.color}`;
  });
}

// ---------------------------------------------------------------------------------------------
// Diagnostics for failure messages. None of these decides a verdict.

/** The element whose right edge is furthest right, for the message that explains an overflow. */
export async function widestElement(page: Page): Promise<string> {
  return (await horizontalExtent(page)).widest;
}

// ---------------------------------------------------------------------------------------------
// Landscape: can the page be scrolled to everything it shows, and is any text cut away?

export interface ScrollReach {
  readonly scrollHeight: number;
  readonly clientHeight: number;
  readonly innerHeight: number;
  /** Bottom edge of the lowest meaningful element, in document coordinates. */
  readonly contentBottom: number;
  /** Bottom edge of the document after scrolling as far as the page allows. */
  readonly reachableBottom: number;
  readonly scrolledTo: number;
  /**
   * The overflow-y the viewport takes: html's, or body's when html's is visible. A script can
   * scroll a hidden viewport, a player cannot.
   */
  readonly viewportOverflowY: string;
}

/** Scrolls to the end and reports whether the lowest content can be brought into view. */
export function pageScrollReach(page: Page): Promise<ScrollReach> {
  return page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    window.scrollTo(0, 0);
    const MEANINGFUL = new Set([
      "BUTTON",
      "A",
      "INPUT",
      "SELECT",
      "TEXTAREA",
      "IMG",
      "SVG",
      "CANVAS",
    ]);
    let contentBottom = 0;
    for (const el of document.body.querySelectorAll("*")) {
      if (el.closest('[aria-hidden="true"], [inert]') !== null || !el.checkVisibility()) continue;
      const own = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
      if (!own && !MEANINGFUL.has(el.tagName.toUpperCase())) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      contentBottom = Math.max(contentBottom, r.bottom + window.scrollY);
    }
    window.scrollTo(0, doc.scrollHeight);
    const scrolledTo = window.scrollY;
    const reachableBottom = scrolledTo + window.innerHeight;
    window.scrollTo(0, 0);
    const html = getComputedStyle(document.documentElement).overflowY;
    return {
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      innerHeight: window.innerHeight,
      contentBottom,
      reachableBottom,
      scrolledTo,
      viewportOverflowY: html !== "visible" ? html : getComputedStyle(document.body).overflowY,
    };
  });
}

/**
 * Elements that hold text but have no box, or whose box lies wholly outside an ancestor that hides
 * overflow. Content that sits below the fold of a scrolling ancestor is reachable and not reported:
 * once the walk up passes a scroller, what is judged is the scroller's own box.
 */
export function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const SKIP = new Set([
      "SCRIPT",
      "STYLE",
      "NOSCRIPT",
      "TEMPLATE",
      "OPTION",
      "OPTGROUP",
      "TITLE",
      "TEXTAREA",
    ]);
    const hides = (value: string) => value === "hidden" || value === "clip";
    const scrolls = (value: string) => value === "auto" || value === "scroll";
    const name = (el: Element) => {
      const id = el.getAttribute("data-testid");
      const cls = [...el.classList].slice(0, 1).join(".");
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
      return `${el.tagName.toLowerCase()}${id ? `[testid=${id}]` : ""}${cls ? `.${cls}` : ""} "${text}"`;
    };
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP.has(el.tagName.toUpperCase())) continue;
      const own = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
      if (!own) continue;
      if (el.closest('[aria-hidden="true"], [inert]') !== null) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (!el.checkVisibility()) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        out.push(`${name(el)} has a ${Math.round(r.width)}x${Math.round(r.height)} box`);
        continue;
      }
      let { top, bottom, left, right } = r;
      for (let a = el.parentElement; a !== null && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const ar = a.getBoundingClientRect();
        const above = hides(cs.overflowY) && (bottom <= ar.top + 0.5 || top >= ar.bottom - 0.5);
        const aside = hides(cs.overflowX) && (right <= ar.left + 0.5 || left >= ar.right - 0.5);
        if (above || aside) {
          out.push(`${name(el)} lies wholly outside ${name(a)}, which hides overflow`);
          break;
        }
        if (scrolls(cs.overflowY)) [top, bottom] = [ar.top, ar.bottom];
        if (scrolls(cs.overflowX)) [left, right] = [ar.left, ar.right];
      }
    }
    return out;
  });
}
