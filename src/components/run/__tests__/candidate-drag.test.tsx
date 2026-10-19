// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "../PlayScreen";

const query = { current: "" };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const realElementFromPoint = document.elementFromPoint;

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventShim extends MouseEvent {
      readonly pointerId: number;
      readonly pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.elementFromPoint = realElementFromPoint;
  sessionStorage.clear();
  localStorage.clear();
});

const RUN_TEST_CLASSIC3 =
  "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=run-test";
const mouse = { pointerId: 9, pointerType: "mouse", button: 0, bubbles: true };

async function startWithGulpinAtStriker(): Promise<void> {
  query.current = RUN_TEST_CLASSIC3;
  render(<PlayScreen />);
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
  fireEvent.click(screen.getByTestId("candidate-316"));
  fireEvent.click(screen.getByTestId("slot-s9"));
  await screen.findByTestId("candidate-296");
}

function moveWindow(x: number, y: number): void {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { ...mouse, clientX: x, clientY: y }));
    vi.advanceTimersByTime(16);
  });
}

describe("candidate drag", () => {
  it("attaches its window pointermove listener once per drag, not once per move (catches the effect re-running on every move)", async () => {
    await startWithGulpinAtStriker();
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const add = vi.spyOn(window, "addEventListener");
    document.elementFromPoint = () => null;
    fireEvent.pointerDown(screen.getByTestId("candidate-296"), {
      ...mouse,
      clientX: 100,
      clientY: 600,
    });
    for (let i = 1; i <= 10; i++) moveWindow(100 + i * 5, 600 - i * 30);
    const pointermoves = add.mock.calls.filter(([type]) => type === "pointermove").length;
    expect(pointermoves).toBe(1);
  });

  it("moves the drag preview by transform to the pointer, not by left and top, and still drops on the slot under it (catches the preview drawn away from the finger)", async () => {
    await startWithGulpinAtStriker();
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const gk = screen.getByTestId("slot-s0");
    document.elementFromPoint = () => gk;
    fireEvent.pointerDown(screen.getByTestId("candidate-296"), {
      ...mouse,
      clientX: 100,
      clientY: 600,
    });
    moveWindow(110, 560);
    moveWindow(150, 400);
    const preview = document.querySelector<HTMLElement>(".dragPreview");
    expect({
      transform: preview?.style.transform,
      left: preview?.style.left,
      top: preview?.style.top,
    }).toEqual({ transform: "translate(150px, 400px)", left: "", top: "" });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { ...mouse, clientX: 150, clientY: 400 }));
    });
    expect(screen.getByTestId("slot-s0").textContent).toContain("Makuhita");
  });
});
