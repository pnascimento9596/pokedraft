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
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

const settingsPanel = () => document.getElementById("settings") as HTMLElement;
const playCard = () => within(screen.getByRole("region", { name: "Play" }));

describe("home Play buttons start the run in one tap (catches the retired Settings confirmed? dialog coming back)", () => {
  it("Play navigates to /play with no dialog", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push.mock.calls).toEqual([
      ["/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3"],
    ]);
  });

  it("Play 151 navigates to the 151 link without regions or style", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 151 Challenge" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push.mock.calls).toEqual([["/play?mode=kanto151&f=3-5-2&order=positionFirst"]]);
  });

  it("clears the saved run for that mode, so Play starts fresh instead of restoring old results", () => {
    localStorage.setItem("pokedraft.run.cup8", '{"screen":"results"}');
    sessionStorage.setItem("pokedraft.run.cup8", '{"screen":"results"}');
    localStorage.setItem("pokedraft.run.kanto151", '{"screen":"draft"}');
    render(<Harness initial={PICKED} />);
    fireEvent.click(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    expect(localStorage.getItem("pokedraft.run.cup8")).toBeNull();
    expect(sessionStorage.getItem("pokedraft.run.cup8")).toBe("cleared");
    expect(localStorage.getItem("pokedraft.run.kanto151")).toBe('{"screen":"draft"}');
  });

  it("prefetches /play when a Play button is pointed at or focused", () => {
    render(<Harness initial={PICKED} />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Play 8-0 Challenge" }));
    fireEvent.focus(screen.getByRole("button", { name: "Play 151 Challenge" }));
    expect(router.prefetch.mock.calls).toEqual([
      ["/play?mode=cup8&f=3-5-2&order=positionFirst&g=12&style=classic3"],
      ["/play?mode=kanto151&f=3-5-2&order=positionFirst"],
    ]);
  });
});

describe("the Matchday selector sits in the Play card (catches a cup started without seeing how it plays)", () => {
  it("shows Manager mode and Match view in the Play card and nowhere else in the side panel", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(playCard().getByRole("switch", { name: /Manager mode/ })).toBeTruthy();
    expect(playCard().getByRole("group", { name: "Match view" })).toBeTruthy();
    expect(screen.getAllByRole("switch", { name: /Manager mode/ })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Matchday" })).toBeNull();
  });

  it("binds to the panel: manager on disables Quick with the hint and keeps the saved Quick", () => {
    const changes: PanelSettings[] = [];
    function Spy() {
      const [panel, setPanel] = useState(DEFAULT_PANEL);
      return (
        <SidePanel
          panel={panel}
          onChange={(next) => {
            changes.push(next);
            setPanel(next);
          }}
          stats={null}
        />
      );
    }
    render(<Spy />);
    fireEvent.click(playCard().getByRole("switch", { name: /Manager mode/ }));
    expect(changes.at(-1)).toMatchObject({ managerMode: true, matchView: "quick" });
    const quick = playCard().getByRole("button", { name: "Quick sim" }) as HTMLButtonElement;
    expect(quick.disabled).toBe(true);
    expect(
      playCard().getByRole("button", { name: "Live match" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(playCard().getByText("Manager mode plays live")).toBeTruthy();
  });
});

describe("the #settings anchor (catches an Edit link that lands on a closed or unfocused panel)", () => {
  it("gives the settings region id settings and points both toggles at it", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(settingsPanel()).not.toBeNull();
    for (const name of ["Challenge Hub", "Hide settings and records"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-controls")).toBe("settings");
    }
  });

  it("opens the settings and focuses their heading when the page loads at #settings", () => {
    window.history.replaceState(null, "", "/#settings");
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Settings and records" }),
    );
  });

  it("reopens collapsed settings when the hash changes to #settings", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("false");
    act(() => {
      window.history.replaceState(null, "", "/#settings");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Settings and records" }),
    );
  });

  it("leaves focus alone on a plain home visit", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(document.activeElement).toBe(document.body);
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
