// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "../PlayScreen";
import * as coachModule from "@/ui/coach";

const query = { current: "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test" };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeAll(async () => {
  await import("../LiveRun");
  HTMLElement.prototype.setPointerCapture = () => {};
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventShim extends MouseEvent {
      readonly pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
  }
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe("drawer swipe render efficiency (4j)", () => {
  it("pointer move during swipe modifies transform directly on the drawer without re-rendering", async () => {
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });

    const drawer = screen.getByTestId("draft-drawer");
    const toggle = drawer.querySelector("button")!;

    const coachSpy = vi.spyOn(coachModule, "useCoachDismissed");
    coachSpy.mockClear();

    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(toggle, { pointerId: 1, clientY: 140 });
    expect(drawer.style.transform).toBe("translateY(40px)");
    fireEvent.pointerMove(toggle, { pointerId: 1, clientY: 160 });
    expect(drawer.style.transform).toBe("translateY(60px)");

    // React state was not updated on move, so DraftBoard did not re-render
    expect(coachSpy).not.toHaveBeenCalled();

    fireEvent.pointerUp(toggle, { pointerId: 1, clientY: 160 });
    expect(drawer.style.transform).toBe("");
  });
});
