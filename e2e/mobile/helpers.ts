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
 * Waits until layout and finite animations have finished. Without it a measurement can land on the
 * first frame of an entrance animation (a dialog opens 16px low, candidates slide in 14px low).
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await frame();
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) =>
          a.finished.then(
            () => undefined,
            () => undefined,
          ),
        ),
    );
    await frame();
    await frame();
  });
}

/** A server-rendered element is only live once React has attached its props to it. */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect
    .poll(() =>
      locator.first().evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$"))),
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
 * Taps an element that is on screen and uncovered, with a real touch at its centre. It never calls
 * `locator.tap()` and never scrolls: Playwright's own scroll-into-view would hide the defect.
 * Unlike `tapInView` it allows the page to have moved since the last step, so it suits setup steps
 * the test reaches by scrolling on purpose.
 */
export async function tapNow(page: Page, locator: Locator, label: string): Promise<void> {
  await locator.first().waitFor({ state: "visible" });
  await settle(page);
  const check = await inViewport(page, locator);
  if (!check.ok) throw new Error(`tap "${label}": ${check.problem}\n${viewportReport(check)}`);
  await tapCentre(page, check);
}

const scrollBaselines = new WeakMap<Page, number>();

/** Forget the scroll position the next `tapInView` compares against (after a navigation). */
export function resetScrollBaseline(page: Page): void {
  scrollBaselines.delete(page);
}

/**
 * One step of a tap-only flow. Fails when the element is not fully on screen and uncovered, or when
 * `window.scrollY` differs from the previous step. Otherwise taps its centre with a real touch.
 */
export async function tapInView(page: Page, locator: Locator, label: string): Promise<void> {
  await locator.first().waitFor({ state: "visible" });
  await settle(page);
  const check = await inViewport(page, locator);
  const before = scrollBaselines.get(page);
  const problems: string[] = [];
  if (!check.ok) problems.push(check.problem!);
  if (before !== undefined && Math.abs(check.viewport.scrollY - before) > 0.5) {
    problems.push(
      `the page scrolled from ${Math.round(before)} to ${Math.round(check.viewport.scrollY)} since the previous step`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`tap "${label}": ${problems.join("; ")}\n${viewportReport(check)}`);
  }
  scrollBaselines.set(page, check.viewport.scrollY);
  await tapCentre(page, check);
}

// ---------------------------------------------------------------------------------------------
// Overflow

/**
 * The right edge of the widest element. html and body clip sideways overflow, so
 * `scrollWidth` alone hides a clipped header or button: measure every element instead.
 */
export function widestRight(page: Page): Promise<number> {
  return page.evaluate(() =>
    [...document.body.querySelectorAll("*")].reduce(
      (widest, el) => Math.max(widest, el.getBoundingClientRect().right),
      0,
    ),
  );
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
 * contents of a closed `<details>`, and zero-size boxes. Disabled controls stay in: they have the
 * same size when they are enabled. A pseudo-element hit area is never counted.
 */
export function interactiveTargets(page: Page): Promise<TargetInfo[]> {
  return page.evaluate(() => {
    const SELECTOR = [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "summary",
      '[role="button"]',
      '[role="tab"]',
      '[role="radio"]',
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
      const input = el as HTMLInputElement;
      const raw =
        el.textContent?.trim() ||
        el.getAttribute("aria-label") ||
        input.placeholder ||
        input.value ||
        "";
      return raw.replace(/\s+/g, " ").slice(0, 40);
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
 */
export async function pointerDrag(page: Page, from: Point, to: Point, steps = 12): Promise<void> {
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
  notRun("real touch drag on WebKit: no API (a mouse drag ran the pointer handlers instead)");
  await pointerDrag(page, from, to);
  return "pointer";
}

export { isChromium };
