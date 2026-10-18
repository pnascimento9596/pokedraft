// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/components/home/HomeScreen";
import { Challenge } from "@/components/run/PlayScreen";
import type { DraftSettings } from "@/engine";
import { builderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";
import { randomDraft } from "../live";

const GEN1: DraftSettings = { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false };

vi.mock("@/ui/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui/settings")>()),
  freshSeed: vi.fn(() => "friendly-1"),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

// A full 16-player Gen 1 squad saved as the builder's checkpoint, so Home opens with it.
function savedFullSquad(panel: Record<string, unknown>): void {
  const draft = randomDraft(GEN1, BUILDER_URL_SEED, "builder-matchday");
  localStorage.setItem(
    "pokedraft.builder",
    JSON.stringify(builderToken(GEN1, draft.lineup, BUILDER_URL_SEED)),
  );
  localStorage.setItem("pokedraft:panel", JSON.stringify(panel));
}

async function friendlyButton(): Promise<HTMLElement> {
  const button = await screen.findByRole(
    "button",
    { name: "Play a friendly cup" },
    { timeout: 10_000 },
  );
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false), {
    timeout: 10_000,
  });
  return button;
}

describe("builder friendlies get the matchday (catches friendlies that skip Manager mode and Live match)", () => {
  it("a builder cup with manager on mounts MatchdayFlow", async () => {
    savedFullSquad({ managerMode: true, matchView: "quick" });
    render(<HomeScreen />);
    fireEvent.click(await friendlyButton());
    const matchday = await screen.findByTestId("matchday", undefined, { timeout: 10_000 });
    expect(matchday.getAttribute("data-match")).toBe("0");
    expect(within(matchday).getByText("Match 1 · Manager mode")).toBeTruthy();
    expect(screen.queryByText("Builder squad")).toBeNull();
  });

  it("a builder cup with Live match on and manager off mounts MatchdayFlow without the touchline", async () => {
    savedFullSquad({ managerMode: false, matchView: "live" });
    render(<HomeScreen />);
    fireEvent.click(await friendlyButton());
    const matchday = await screen.findByTestId("matchday", undefined, { timeout: 10_000 });
    expect(within(matchday).getByText("Match 1")).toBeTruthy();
  });

  it("with manager off and Quick sim the friendly still goes straight to its results", async () => {
    savedFullSquad({ managerMode: false, matchView: "quick" });
    render(<HomeScreen />);
    fireEvent.click(await friendlyButton());
    expect(await screen.findByText("Builder squad", undefined, { timeout: 10_000 })).toBeTruthy();
    expect(screen.queryByTestId("matchday")).toBeNull();
  });

  it("a reload during a builder matchday comes back to that matchday", async () => {
    savedFullSquad({ managerMode: true, matchView: "live" });
    render(<HomeScreen />);
    fireEvent.click(await friendlyButton());
    await screen.findByTestId("matchday", undefined, { timeout: 10_000 });
    cleanup();
    render(<HomeScreen />);
    const back = await screen.findByTestId("matchday", undefined, { timeout: 10_000 });
    expect(back.getAttribute("data-match")).toBe("0");
    expect(within(back).getByText("Match 1 · Manager mode")).toBeTruthy();
  });
});

describe("Matchday toggles beside Play a friendly cup (catches friendlies with no visible matchday choice)", () => {
  it("sit next to the button and move the side panel's Manager mode switch with them", async () => {
    savedFullSquad({ managerMode: false, matchView: "quick" });
    render(<HomeScreen />);
    const row = (await friendlyButton()).parentElement!;
    const toggle = within(row).getByTestId("manager-mode");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    const switches = screen.getAllByRole("switch", { name: /Manager mode/ });
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "true"]);
    expect(JSON.parse(localStorage.getItem("pokedraft:panel")!).managerMode).toBe(true);
  });

  it("the builder challenge start card shows the Matchday settings", () => {
    render(<Challenge settings={GEN1} querySeed={null} />);
    expect(screen.getByTestId("matchday-settings")).toBeTruthy();
  });
});
