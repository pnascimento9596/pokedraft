// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createDraft, type DraftSettings, type SpeciesId } from "@/engine";
import { builderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";
import { DEFAULT_PANEL, type PanelSettings } from "@/ui/settings";
import { HomeScreen } from "../HomeScreen";
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
const playCard = () =>
  within(screen.getByRole("region", { name: "Draft a Pokémon XI and win the cup." }));

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
  it("gives the settings region id settings and points the settings toggle at it", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(settingsPanel()).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Settings and records" }).getAttribute("aria-controls"),
    ).toBe("settings");
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
    fireEvent.click(screen.getByRole("button", { name: "Settings and records" }));
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

  it("keeps #settings in the URL when the builder writes its squad link (catches the hash dropped once the builder loads)", async () => {
    const gen1: DraftSettings = {
      mode: "builder",
      formation: "4-3-3",
      gens: [1],
      legendaries: false,
    };
    const draft = applyAction(createDraft(gen1, BUILDER_URL_SEED), {
      type: "place",
      species: 1 as SpeciesId,
      slot: { kind: "starter", index: 2 },
    });
    const token = builderToken(gen1, draft.lineup, BUILDER_URL_SEED);
    localStorage.setItem("pokedraft.builder", JSON.stringify(token));
    window.history.replaceState(null, "", "/#settings");
    render(<HomeScreen />);
    await waitFor(() => expect(window.location.search).toBe(`?b=${token}`), { timeout: 10_000 });
    expect(window.location.hash).toBe("#settings");
  });

  it("leaves focus alone on a plain home visit", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(document.activeElement).toBe(document.body);
  });
});

describe("the settings toggle (catches settings a player cannot open or close again)", () => {
  it("opens the unset settings, then collapses and reopens them", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(settingsPanel().getAttribute("data-open")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Hide settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Settings and records" }));
    expect(settingsPanel().getAttribute("data-open")).toBe("true");
  });
});
