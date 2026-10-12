// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PANEL, type PanelSettings } from "@/ui/settings";
import { SidePanel } from "../SidePanel";

const router = { push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const PICKED: PanelSettings = {
  ...DEFAULT_PANEL,
  formation: "3-5-2",
  gens: [1, 2],
  style: "classic3",
  order: "positionFirst",
};

function Harness({ initial }: { readonly initial: PanelSettings }) {
  const [panel, setPanel] = useState(initial);
  return <SidePanel panel={panel} onChange={setPanel} stats={null} />;
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function shown(dialog: HTMLElement): string[][] {
  return [...dialog.querySelectorAll("dl > div")].map((row) => [
    row.querySelector("dt")!.textContent!,
    row.querySelector("dd")!.textContent!,
  ]);
}

const settingsPanel = () => document.querySelector("[data-open]") as HTMLElement;

describe("home Play buttons ask before they start a run", () => {
  it("opens a dialog with the chosen 8-0 settings and does not navigate until Yes", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    const dialog = screen.getByRole("dialog", { name: "Settings confirmed?" });
    expect(shown(dialog)).toEqual([
      ["Formation", "3-5-2"],
      ["Regions", "Kanto, Johto"],
      ["Style", "Classic"],
      ["Order", "Position First"],
    ]);
    expect(router.push.mock.calls).toEqual([]);
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Yes, play" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, play" }));
    expect(router.push.mock.calls).toEqual([
      ["/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3"],
    ]);
  });

  it("removes the modal dialog once Yes navigates, so a hidden home page cannot block /play", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 151 Challenge" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, play" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prefetches /play when the dialog opens so Yes is as fast as the old link", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    expect(router.prefetch).toHaveBeenCalledWith(
      "/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3",
    );
  });

  it("omits regions and style from the 151 dialog because that mode ignores them", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 151 Challenge" }));
    const dialog = screen.getByRole("dialog", { name: "Settings confirmed?" });
    expect(shown(dialog)).toEqual([
      ["Formation", "3-5-2"],
      ["Order", "Position First"],
    ]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, play" }));
    expect(router.push.mock.calls).toEqual([["/play?mode=kanto151&f=3-5-2&order=positionFirst"]]);
  });

  it("No closes the dialog without navigating, expands collapsed settings and focuses Formation", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    fireEvent.click(screen.getByRole("button", { name: "No, edit settings" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push.mock.calls).toEqual([]);
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Formation"));
  });

  it("treats Escape (the browser closing the dialog) as No", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 151 Challenge" }));
    act(() => screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true })));
    act(() => (screen.getByRole("dialog") as HTMLDialogElement).close());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push.mock.calls).toEqual([]);
    expect(document.activeElement).toBe(screen.getByLabelText("Formation"));
  });

  it("shows the settings changed after a dismissed dialog, never a stale snapshot", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    fireEvent.click(screen.getByRole("button", { name: "No, edit settings" }));
    fireEvent.change(screen.getByLabelText("Formation"), { target: { value: "5-3-2" } });
    fireEvent.click(
      within(screen.getByRole("group", { name: "Draft style" })).getByRole("button", {
        name: "Open",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    expect(shown(screen.getByRole("dialog"))).toEqual([
      ["Formation", "5-3-2"],
      ["Regions", "Kanto, Johto"],
      ["Style", "Open"],
      ["Order", "Position First"],
    ]);
  });
});

describe("settings are open by default (catches settings hidden behind a toggle on phones)", () => {
  it("renders expanded in the server HTML", () => {
    const html = renderToString(
      <SidePanel panel={DEFAULT_PANEL} onChange={() => {}} stats={null} />,
    );
    expect(html).toContain('data-open="true"');
    expect(html).toContain('aria-expanded="true"');
  });

  it("still lets the player collapse and re-expand the settings", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Hide settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
  });
});
