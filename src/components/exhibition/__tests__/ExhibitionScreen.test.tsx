// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lineup, Seed } from "@/engine";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { builderToken } from "@/ui/builder-token";
import { ExhibitionScreen } from "../ExhibitionScreen";

const query = vi.hoisted(() => ({ value: "" }));
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query.value),
}));

const lineup: Lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as unknown as Lineup["starters"],
  bench: [12, 13, 14, 15, 16] as unknown as Lineup["bench"],
};
const settings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
} as const;
const BUILDER = builderToken(settings, lineup, "builder" as Seed);
const OPPONENT = builderToken(settings, lineup, "opponent-0" as Seed);
const GOLDEN_SQUAD = [
  849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
];
const GOLDEN_RECORD = {
  token: GOLDEN_CUP8_V3,
  squadSpeciesIds: GOLDEN_SQUAD,
  bucket: "cup8:open",
  friendly: false,
  formation: "4-2-3-1",
  score: 700,
  wins: 3,
  draws: 0,
  losses: 2,
  finish: "R16",
  flawless: false,
  at: "2026-10-17T12:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Manager mode is off by default, so Skip to full time ends the match at once.
async function playToFullTime() {
  fireEvent.click(screen.getByTestId("exhibition-kickoff"));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  fireEvent.click(screen.getByTestId("skip-ft"));
}

function open(search: string) {
  query.value = search;
  render(<ExhibitionScreen />);
}

describe("mirror match", () => {
  it("says Same squad on both sides when home and away decode to one squad, and still plays it (catches a mirror reading as two teams)", async () => {
    open(`home=${BUILDER}&away=${OPPONENT}`);
    expect(screen.getByTestId("exhibition-mirror").textContent).toBe("Same squad on both sides");
    await playToFullTime();
    // Engine 6 with both benches: the builder squad against itself on seed opponent-0, rematch 0.
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4-0");
  });

  it("shows no mirror note for two different squads", async () => {
    open(`home=${BUILDER}&away=${GOLDEN_CUP8_V3}`);
    expect(screen.queryByTestId("exhibition-mirror")).toBeNull();
    await playToFullTime();
    expect(screen.getByTestId("exhibition-score").textContent).toMatch(/^\d+-\d+$/);
  });
});

describe("side labels", () => {
  it("names the other side after the board nickname, else Their squad (catches the hardcoded Shared squad)", async () => {
    open(`home=${BUILDER}&away=${GOLDEN_CUP8_V3}&name=Misty`);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Your squad vs Misty's squad",
    );
    await playToFullTime();
    const board = screen.getByTestId("matchday-scoreboard");
    expect(board.textContent).toContain("Misty's squad");
    expect(board.textContent).not.toContain("Shared squad");
    expect(screen.getByTestId("exhibition-fulltime").textContent).toMatch(
      /^Full time, \d+-\d+\. (Your squad wins|Misty's squad wins|Honours even)\./,
    );
    cleanup();
    open(`home=${BUILDER}&away=${GOLDEN_CUP8_V3}`);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Your squad vs their squad");
    await playToFullTime();
    expect(screen.getByTestId("matchday-scoreboard").textContent).toContain("Their squad");
  });
});

describe("challenger", () => {
  it("defaults home to the newest qualifying history squad and lists it with the Builder lineup (catches the Builder-only challenger)", () => {
    localStorage.setItem("pokedraft:history:v1", JSON.stringify([GOLDEN_RECORD]));
    localStorage.setItem("pokedraft.builder", JSON.stringify(BUILDER));
    open(`away=${OPPONENT}`);
    const picker = screen.getByRole("combobox", { name: "Your squad" }) as HTMLSelectElement;
    expect(picker.value).toBe(GOLDEN_CUP8_V3);
    expect([...picker.options].map((option) => option.value)).toEqual([GOLDEN_CUP8_V3, BUILDER]);
    expect(picker.options[1]!.textContent).toBe("Builder lineup");
    expect(picker.options[0]!.textContent).toContain("4-2-3-1, 3-0-2");
    fireEvent.change(picker, { target: { value: BUILDER } });
    expect(replace).toHaveBeenCalledWith(`/exhibition?home=${BUILDER}&away=${OPPONENT}`, {
      scroll: false,
    });
  });

  it("shows the empty state with Play and Builder links when there is no squad to play with", () => {
    open(`away=${OPPONENT}`);
    expect(screen.getByTestId("exhibition-empty").textContent).toContain(
      "Play a cup or save a full squad in the Builder",
    );
    expect(screen.getByRole("link", { name: "Play a cup" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Open the Builder" }).getAttribute("href")).toBe("/");
    expect(screen.queryByTestId("exhibition-score")).toBeNull();
  });

  it("never writes history or lifetime totals (catches an exhibition counted as a run)", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(BUILDER));
    open(`away=${OPPONENT}&legs=2&n=3`);
    await playToFullTime();
    fireEvent.click(screen.getByRole("button", { name: "Play leg 2" }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.getByTestId("exhibition-aggregate").textContent).toBe("0-1");
    expect(Object.keys(localStorage)).toEqual(["pokedraft.builder"]);
  });
});

describe("route state", () => {
  it("moves the rematch counter and the legs through the URL (catches rematches that a shared link cannot replay)", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(BUILDER));
    open(`away=${OPPONENT}&n=1`);
    await playToFullTime();
    expect(screen.getByTestId("exhibition-score").textContent).toBe("1-1");
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(replace).toHaveBeenLastCalledWith(`/exhibition?away=${OPPONENT}&n=2`, {
      scroll: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Two legs" }));
    expect(replace).toHaveBeenLastCalledWith(`/exhibition?away=${OPPONENT}&n=1&legs=2`, {
      scroll: false,
    });
  });

  it("explains a link with no readable other squad instead of playing", () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(BUILDER));
    open("away=garbage");
    expect(screen.getByTestId("exhibition-broken").textContent).toContain(
      "This exhibition link has no squad to play against.",
    );
    expect(screen.queryByTestId("exhibition-score")).toBeNull();
  });
});
