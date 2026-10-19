// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createDraft, type DraftSettings, type SpeciesId } from "@/engine";
import { builderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";
import { DEFAULT_PANEL, type PanelSettings } from "@/ui/settings";
import { HomeScreen } from "../HomeScreen";
import { SidePanel } from "../SidePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));

const H1 = "Draft a Pokémon XI and win the cup.";

function Harness({ initial }: { readonly initial: PanelSettings }) {
  const [panel, setPanel] = useState(initial);
  return <SidePanel panel={panel} onChange={setPanel} stats={null} />;
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const headings = () =>
  [...document.querySelectorAll("h1, h2, h3")].map((h) => `${h.tagName} ${h.textContent}`);
const card = (name: string) =>
  within(screen.getByRole("heading", { name, level: 2 }).closest("[data-card]") as HTMLElement);

describe("home heading order is h1 then h2s (catches h2s before the h1 and the builder as a second h1)", () => {
  it("lists the game pitch h1 first, then the cards, the settings and the friendly builder", () => {
    render(<HomeScreen />);
    expect(headings()).toEqual([
      `H1 ${H1}`,
      "H2 8-0 Challenge",
      "H2 151 Challenge",
      "H2 Daily",
      "H2 Settings and records",
      "H3 Setup",
      "H3 Rules",
      "H3 Your records",
      "H2 Friendly builder",
    ]);
  });

  it("gives the h1 its one-line sub and drops the Trainer Dugout eyebrow", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Spin for players, fill a formation, then play the cup.")).toBeTruthy();
    expect(screen.queryByText("Trainer Dugout")).toBeNull();
    expect(screen.getByText("Build your XI, then play a Friendly cup.")).toBeTruthy();
  });
});

describe("the challenge cards (catches rules missing from the cards or a style shown on the 151)", () => {
  it("puts one rule line and the Play button on each challenge card", () => {
    render(<Harness initial={{ ...DEFAULT_PANEL, style: "classic3" }} />);
    expect(
      card("8-0 Challenge").getByText(
        "Each round rolls a region and a type. Draft one Pokémon that matches both.",
      ),
    ).toBeTruthy();
    expect(card("8-0 Challenge").getByText("Draft style: Classic")).toBeTruthy();
    expect(card("8-0 Challenge").getByRole("button", { name: "Play 8-0 Challenge" })).toBeTruthy();
    expect(
      card("151 Challenge").getByText(
        "Only the original 151. Each round rolls a single Pokémon and you place it in your squad.",
      ),
    ).toBeTruthy();
    expect(card("151 Challenge").queryByText(/Draft style/)).toBeNull();
    expect(card("151 Challenge").getByRole("button", { name: "Play 151 Challenge" })).toBeTruthy();
  });
});

describe("Daily card date equals /daily's date (catches a second clock or a UTC date on the card)", () => {
  it("shows the New York date /daily plays at 03:30 UTC on 20 October, and links to /daily", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T03:30:00Z"));
    render(<Harness initial={DEFAULT_PANEL} />);
    expect(card("Daily").getByText("Monday, October 19, 2026")).toBeTruthy();
    expect(
      card("Daily").getByText(
        "Everyone plays the same seed today, and your run can go on the daily board.",
      ),
    ).toBeTruthy();
    expect(card("Daily").getByRole("link", { name: "Play Daily" }).getAttribute("href")).toBe(
      "/daily",
    );
  });

  it("leaves the date out of the server HTML, so hydration cannot disagree", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T03:30:00Z"));
    const html = renderToString(
      <SidePanel panel={DEFAULT_PANEL} onChange={() => {}} stats={null} />,
    );
    expect(html).toContain("Play Daily");
    expect(html).not.toContain("October");
  });
});

describe("one control for the settings region (catches the duplicate Challenge Hub toggle)", () => {
  it("has exactly one button pointing at the settings region, and no Challenge Hub", () => {
    render(<Harness initial={DEFAULT_PANEL} />);
    const controls = [...document.querySelectorAll('[aria-controls="settings"]')].map(
      (el) => el.textContent,
    );
    expect(controls).toEqual(["Settings and records"]);
    expect(screen.queryByText("Challenge Hub")).toBeNull();
  });
});

describe("settings start unset, so CSS collapses them below 1024px (catches settings open on phones by default)", () => {
  it("renders the toggle collapsed and the region without data-open in the server HTML", () => {
    const html = renderToString(
      <SidePanel panel={DEFAULT_PANEL} onChange={() => {}} stats={null} />,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("data-open");
  });
});

describe("the builder header carries fill and chemistry (catches the challenge hub line mixing in builder chemistry)", () => {
  it("shows 4% chemistry for Bulbasaur and Ivysaur side by side in the builder header", async () => {
    const gen1: DraftSettings = {
      mode: "builder",
      formation: "4-3-3",
      gens: [1],
      legendaries: false,
    };
    let draft = createDraft(gen1, BUILDER_URL_SEED);
    for (const [species, index] of [
      [1, 0],
      [2, 1],
    ] as const) {
      draft = applyAction(draft, {
        type: "place",
        species: species as SpeciesId,
        slot: { kind: "starter", index },
      });
    }
    localStorage.setItem(
      "pokedraft.builder",
      JSON.stringify(builderToken(gen1, draft.lineup, BUILDER_URL_SEED)),
    );
    render(<HomeScreen />);
    await waitFor(
      () => expect(screen.getByTestId("team-score").textContent).toContain("4% chemistry"),
      { timeout: 10_000 },
    );
    expect(screen.getByTestId("team-score").textContent).toBe(
      "2/16Fill all 16 to see your Team Score4% chemistry",
    );
    expect(screen.queryByText(/% Chem$/)).toBeNull();
  });
});
