// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { ManagerAction } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchdayFlow } from "../MatchdayFlow";

// Engine 7 switches the control on with missable penalties; this stands in for the flip.
vi.mock("@/ui/manager/touchline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui/manager/touchline")>()),
  SET_PIECES_ON: true,
}));

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const CTX = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };

beforeEach(() => {
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

const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;

describe("pre-match set pieces (catches a nomination the card drops or records as a tactic)", () => {
  it("offers Penalties and Free kicks, each on Auto (best shooter) with the eleven listed", () => {
    open(true);
    expect(screen.getByRole("group", { name: "Set pieces" })).toBeTruthy();
    for (const set of ["penalty", "freeKick"]) {
      expect(select(`taker-${set}`).value).toBe("auto");
      expect(select(`taker-${set}`).options.length).toBe(12);
      expect(select(`taker-${set}`).options[0]!.textContent).toBe("Auto (best shooter)");
    }
    expect(screen.getByLabelText("Penalties")).toBe(select("taker-penalty"));
    expect(screen.getByLabelText("Free kicks")).toBe(select("taker-freeKick"));
  });

  it("a penalty taker in slot 10 records only that nomination at 0'", () => {
    const flow = open(true);
    fireEvent.change(select("taker-penalty"), { target: { value: "10" } });
    fireEvent.click(screen.getByTestId("prematch-go"));
    expect(flow.actions()).toEqual([
      { type: "taker", match: 0, minute: 0, set: "penalty", slot: 10 },
    ]);
    expect(screen.getByTestId("match-player")).toBeTruthy();
  });

  it("picking a taker and going back to Auto records nothing", () => {
    const flow = open(true);
    fireEvent.change(select("taker-freeKick"), { target: { value: "9" } });
    fireEvent.change(select("taker-freeKick"), { target: { value: "auto" } });
    fireEvent.click(screen.getByTestId("prematch-go"));
    expect(flow.actions()).toEqual([]);
  });

  it("never shows in sim mode", () => {
    open(false);
    expect(screen.queryByTestId("set-pieces")).toBeNull();
  });
});
