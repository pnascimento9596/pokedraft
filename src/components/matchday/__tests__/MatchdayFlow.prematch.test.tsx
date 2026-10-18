// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { ManagerAction } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchdayFlow } from "../MatchdayFlow";

const spy = vi.hoisted(() => ({ decide: 0 }));

vi.mock("@/ui/manager/touchline", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/ui/manager/touchline")>();
  return {
    ...real,
    decide: (...args: Parameters<typeof real.decide>) => {
      spy.decide++;
      return real.decide(...args);
    },
  };
});

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const CTX = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };

beforeEach(() => {
  spy.decide = 0;
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
});

/** Renders the first match's pre-match card and returns the decisions as last reported. */
function open(managerMode: boolean): { actions: () => readonly ManagerAction[] } {
  let last: readonly ManagerAction[] = [];
  render(
    <MatchdayFlow
      ctx={CTX}
      initialCup={cup}
      view="live"
      managerMode={managerMode}
      onProgress={(manager) => {
        last = manager;
      }}
      onFinish={() => {}}
    />,
  );
  return { actions: () => last };
}

describe("pre-match tactic (catches a starting tactic that needs a 0' stop, or a Balanced kickoff that switches the assistant off)", () => {
  it("Attack on PreMatch records { type: 'tactic', match: 0, minute: 0, tactic: 'attack' }", () => {
    const flow = open(true);
    fireEvent.click(screen.getByTestId("tactic-attack"));
    expect(screen.getByTestId("tactic-attack").getAttribute("aria-pressed")).toBe("true");
    expect(flow.actions()).toEqual([]);
    fireEvent.click(screen.getByTestId("prematch-go"));
    expect(flow.actions()).toEqual([{ type: "tactic", match: 0, minute: 0, tactic: "attack" }]);
    expect(screen.queryByTestId("prematch")).toBeNull();
    expect(screen.getByTestId("match-player")).toBeTruthy();
  });

  it("Balanced on PreMatch records no action and never calls decide", () => {
    const flow = open(true);
    expect(screen.getByTestId("tactic-balanced").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("tactic-attack"));
    fireEvent.click(screen.getByTestId("tactic-balanced"));
    fireEvent.click(screen.getByTestId("prematch-go"));
    expect(spy.decide).toBe(0);
    expect(flow.actions()).toEqual([]);
    expect(screen.getByTestId("match-player")).toBeTruthy();
  });

  it("offers the five tactics in manager mode and labels the button Kick off", () => {
    open(true);
    const pills = screen.getByRole("group", { name: "Starting tactic" });
    expect([...pills.querySelectorAll("button")].map((b) => b.dataset.testid)).toEqual([
      "tactic-balanced",
      "tactic-attack",
      "tactic-defend",
      "tactic-press",
      "tactic-counter",
    ]);
    expect(screen.getByTestId("prematch-go").textContent).toBe("Kick off");
  });

  it("shows no tactic pills with manager mode off, and Kick off still records nothing", () => {
    const flow = open(false);
    expect(screen.queryByTestId("tactic-attack")).toBeNull();
    expect(screen.getByTestId("prematch-go").textContent).toBe("Kick off");
    fireEvent.click(screen.getByTestId("prematch-go"));
    expect(spy.decide).toBe(0);
    expect(flow.actions()).toEqual([]);
  });
});
