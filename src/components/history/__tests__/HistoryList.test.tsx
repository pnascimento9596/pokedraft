// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import type { RunRecord } from "@/ui/runs";
import { HistoryList } from "../HistoryList";

const runs: readonly RunRecord[] = [
  {
    token: "ranked-flawless",
    bucket: "cup8:open",
    friendly: false,
    formation: "4-3-3",
    score: 820,
    wins: 8,
    draws: 0,
    losses: 0,
    finish: "champion",
    flawless: true,
    at: "2026-10-14T12:00:00Z",
  },
  {
    token: "ranked-cup",
    bucket: "kanto151",
    friendly: false,
    formation: "3-5-2",
    score: 910,
    wins: 7,
    draws: 1,
    losses: 0,
    finish: "champion",
    flawless: false,
    at: "2026-10-13T12:00:00Z",
  },
  {
    token: "ranked-exit",
    bucket: "cup8:classic3",
    friendly: false,
    formation: "4-4-2",
    score: 735,
    wins: 3,
    draws: 0,
    losses: 2,
    finish: "R16",
    flawless: false,
    at: "2026-10-12T12:00:00Z",
  },
  {
    token: "friendly-cup",
    bucket: "builder",
    friendly: true,
    formation: "4-3-3",
    score: 999,
    wins: 8,
    draws: 0,
    losses: 0,
    finish: "champion",
    flawless: true,
    at: "2026-10-11T12:00:00Z",
  },
];

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function summaryValue(label: string): string | null {
  return (
    within(screen.getByRole("region", { name: "Career summary" })).getByText(label)
      .nextElementSibling?.textContent ?? null
  );
}

describe("Stored career history", () => {
  it("counts only ranked stored runs and excludes the friendly's higher score and trophies", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
    render(<HistoryList />);
    expect(summaryValue("Total ranked runs")).toBe("3");
    expect(summaryValue("Ranked cups won")).toBe("2");
    expect(summaryValue("Ranked flawless finishes")).toBe("1");
    expect(summaryValue("Best ranked Team Score")).toBe("910");
    expect(
      screen.getByText(
        "Based only on stored history in this browser on this device, up to 50 runs. Not a lifetime total. Friendlies are excluded from the summary.",
      ),
    ).toBeTruthy();
  });

  it("filters champions without changing the career totals and can return to all runs", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify(runs));
    render(<HistoryList />);
    expect(within(screen.getByTestId("history-list")).getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Champions only" }));
    expect(
      screen.getByRole("button", { name: "Champions only" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(screen.getByTestId("history-list"))
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/r/ranked-flawless", "/r/ranked-cup", "/r/friendly-cup"]);
    expect(summaryValue("Total ranked runs")).toBe("3");
    fireEvent.click(screen.getByRole("button", { name: "All runs" }));
    expect(within(screen.getByTestId("history-list")).getAllByRole("listitem")).toHaveLength(4);
  });

  it("shows a filter-specific empty message rather than claiming there are no stored runs", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify([runs[2]]));
    render(<HistoryList />);
    fireEvent.click(screen.getByRole("button", { name: "Champions only" }));
    expect(screen.getByText("No champions in stored history yet.")).toBeTruthy();
    expect(screen.queryByTestId("history-empty")).toBeNull();
    expect(summaryValue("Total ranked runs")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "All runs" }));
    expect(within(screen.getByTestId("history-list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("does not fabricate a best ranked score when only friendlies are stored", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify([runs[3]]));
    render(<HistoryList />);
    expect(summaryValue("Total ranked runs")).toBe("0");
    expect(summaryValue("Ranked cups won")).toBe("0");
    expect(summaryValue("Ranked flawless finishes")).toBe("0");
    expect(summaryValue("Best ranked Team Score")).toBe("Not yet");
  });

  it("preserves the existing history-empty guidance when no valid runs are stored", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify([{ token: "broken" }]));
    render(<HistoryList />);
    expect(screen.getByTestId("history-empty").textContent).toBe(
      "No runs yet.Finished runs on this device show up here.Start a run",
    );
    expect(screen.getByRole("link", { name: "Start a run" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("button", { name: "Champions only" })).toBeNull();
  });
});

it("shows match win rate by formation and all species with honest missing-history coverage", () => {
  localStorage.setItem(
    "pokedraft:history:v1",
    JSON.stringify([{ ...runs[0], squadSpeciesIds: [1, 25, 1025] }, runs[2], runs[3]]),
  );
  render(<HistoryList />);
  expect(screen.getByRole("region", { name: "Win rate by formation" }).textContent).toContain(
    "4-3-3",
  );
  expect(screen.getByRole("region", { name: "Win rate by formation" }).textContent).toContain(
    "100.0%",
  );
  expect(
    screen.getByText(
      "Squad coverage: 1 of 2 ranked stored runs. Species from older runs without squad metadata are unknown.",
    ),
  ).toBeTruthy();
  expect(screen.getByRole("img", { name: "Pikachu" })).toBeTruthy();
  expect(screen.queryByRole("img", { name: /^Squad species/ })).toBeNull();
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a Hall of Fame species" }), {
    target: { value: "Pecharunt" },
  });
  expect(screen.getByRole("region", { name: "Species Hall of Fame" }).textContent).toContain(
    "Pecharunt",
  );
  expect(screen.getByRole("region", { name: "Species Hall of Fame" }).textContent).toContain(
    "1 drafted squad",
  );
  expect(screen.getByRole("region", { name: "Species Hall of Fame" }).textContent).toContain(
    "1 champion squad",
  );
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a Hall of Fame species" }), {
    target: { value: "Ivysaur" },
  });
  expect(screen.getByRole("region", { name: "Species Hall of Fame" }).textContent).toContain(
    "No species match these filters.",
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Filter Hall of Fame species" }), {
    target: { value: "all" },
  });
  expect(screen.getByRole("region", { name: "Species Hall of Fame" }).textContent).toContain(
    "No recorded squads",
  );
});

describe("Species Hall of Fame default", () => {
  function hallFilter(): string {
    return (
      screen.getByRole("combobox", { name: "Filter Hall of Fame species" }) as HTMLSelectElement
    ).value;
  }

  function hallNames(): string[] {
    return within(screen.getByRole("region", { name: "Species Hall of Fame" }))
      .getAllByRole("listitem")
      .map((li) => li.querySelector("strong")?.textContent ?? "");
  }

  it("opens on the drafted species when stored squads exist (catches a returning player landing on 1,025 species they never drafted)", () => {
    localStorage.setItem(
      "pokedraft:history:v1",
      JSON.stringify([{ ...runs[0], squadSpeciesIds: [1, 25, 1025] }, runs[2]]),
    );
    render(<HistoryList />);
    expect(hallFilter()).toBe("drafted");
    expect(hallNames()).toEqual(["#1 Bulbasaur", "#25 Pikachu", "#1025 Pecharunt"]);
  });

  it("opens on all species when no stored run has a squad, so a new player never sees an empty grid", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify([runs[0], runs[2]]));
    render(<HistoryList />);
    expect(hallFilter()).toBe("all");
    expect(hallNames().slice(0, 2)).toEqual(["#1 Bulbasaur", "#2 Ivysaur"]);
  });

  it("keeps the player's own choice after the default", () => {
    localStorage.setItem(
      "pokedraft:history:v1",
      JSON.stringify([{ ...runs[0], squadSpeciesIds: [1, 25, 1025] }]),
    );
    render(<HistoryList />);
    fireEvent.change(screen.getByRole("combobox", { name: "Filter Hall of Fame species" }), {
      target: { value: "all" },
    });
    expect(hallFilter()).toBe("all");
    expect(hallNames().slice(0, 2)).toEqual(["#1 Bulbasaur", "#2 Ivysaur"]);
  });
});

it("names each history challenge link by its run (catches every row reading the same Challenge this Seed)", () => {
  localStorage.setItem(
    "pokedraft:history:v1",
    JSON.stringify([
      { ...runs[2], token: GOLDEN_CUP8_V3 },
      { ...runs[0], token: "no-challenge" },
    ]),
  );
  render(<HistoryList />);
  const links = screen.getAllByRole("link", { name: /^Challenge this Seed/ });
  expect(links).toHaveLength(1);
  expect(links[0].textContent).toBe("Challenge this Seed");
  expect(links[0].getAttribute("aria-label")).toMatch(/^Challenge this Seed: .*2026.*, 3-0-2$/);
});

it("links each history row to an exhibition against its squad (catches the exhibition only opening from a shared page)", () => {
  localStorage.setItem(
    "pokedraft:history:v1",
    JSON.stringify([
      { ...runs[2], token: GOLDEN_CUP8_V3 },
      { ...runs[0], token: "no-squad" },
    ]),
  );
  render(<HistoryList />);
  const links = screen.getAllByRole("link", { name: /^Exhibition vs this squad/ });
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe(`/exhibition?away=${GOLDEN_CUP8_V3}`);
  expect(links[0].textContent).toBe("Exhibition vs this squad");
  expect(links[0].getAttribute("aria-label")).toMatch(
    /^Exhibition vs this squad: .*2026.*, 3-0-2$/,
  );
});
