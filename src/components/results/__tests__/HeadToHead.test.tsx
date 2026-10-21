// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { replay } from "@/engine";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { HeadToHead, opponentOf } from "../HeadToHead";

// Seed golden-cup8, 4-2-3-1 Classic. THEIRS is the golden engine-5 draft under the live prefix:
// observed 5-0-1, Team Score 593, out in the Quarter-final on penalties. MINE is the first offered
// player into the first open slot on the same seed: observed 1-1-2, Team Score 406.
const THEIRS = GOLDEN_CUP8_V5.replace(/^pd5\./, "pd7.");
const MINE =
  "pd7.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1sicCIsODgzLCJzMCJdLFsicCIsMzE1LCJzMSJdLFsicCIsMjcyLCJzMiJdLFsicCIsNjkxLCJzMyJdLFsicCIsNDUzLCJzNCJdLFsicCIsNzU0LCJzNSJdLFsicCIsMzc2LCJzNiJdLFsicCIsMTc1LCJzNyJdLFsicCIsNjYzLCJzOCJdLFsicCIsMTg4LCJzOSJdLFsicCIsNzM3LCJzMTAiXSxbInAiLDc4NCwiYjAiXSxbInAiLDcwMywiYjEiXSxbInAiLDk0MiwiYjIiXSxbInAiLDE0NSwiYjMiXSxbInAiLDg4NCwiYjQiXV1d";
const URL_BASE =
  "http://localhost:3000/play?mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3&seed=golden-cup8";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "clipboard");
});

function rows(): string[][] {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .map((tr) => [...tr.querySelectorAll("th, td")].map((cell) => cell.textContent ?? ""));
}

describe("HeadToHead (catches a side by side that shows the wrong records, rounds or winner)", () => {
  it("shows both records and Team Scores, the scores of every round either side played, and who won the seed", () => {
    render(
      <HeadToHead
        token={MINE}
        mine={replay(MINE)}
        theirs={opponentOf({ kind: "live", token: THEIRS })!}
      />,
    );
    expect(screen.getByTestId("h2h-you").textContent).toBe("You2-1-2Team Score 406");
    expect(screen.getByTestId("h2h-them").textContent).toBe("Them5-0-1Team Score 593");
    expect(rows()).toEqual([
      ["Round", "You", "Them"],
      ["Group match 1", "0-0", "3-0"],
      ["Group match 2", "1-0", "7-0"],
      ["Group match 3", "0-2", "6-1"],
      ["Round of 32", "3-3 (won on pens)", "6-2"],
      ["Round of 16", "0-1", "2-0"],
      ["Quarter-final", "Out", "2-2 (lost on pens)"],
    ]);
    expect(screen.getByTestId("h2h-verdict").textContent).toBe("They win the seed");
  });

  it("says You win the seed from the other side", () => {
    render(
      <HeadToHead
        token={THEIRS}
        mine={replay(THEIRS)}
        theirs={opponentOf({ kind: "live", token: MINE })!}
      />,
    );
    expect(screen.getByTestId("h2h-verdict").textContent).toBe("You win the seed");
  });

  it("says Level on the seed for the same run", () => {
    render(
      <HeadToHead
        token={MINE}
        mine={replay(MINE)}
        theirs={opponentOf({ kind: "live", token: MINE })!}
      />,
    );
    expect(screen.getByTestId("h2h-verdict").textContent).toBe("Level on the seed");
  });

  it("shows only the engine line for a retained run, and never invents its result", () => {
    const theirs = opponentOf({ kind: "retained", token: GOLDEN_CUP8_V5, engine: 5 });
    render(<HeadToHead token={MINE} mine={replay(MINE)} theirs={theirs!} />);
    expect(screen.getByTestId("h2h-retained").textContent).toBe(
      "Their run used engine v5, so there is no side by side.",
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByTestId("h2h-verdict")).toBeNull();
    expect(screen.queryByTestId("h2h-them")).toBeNull();
  });

  it("gives nothing to compare for a live token that does not replay", () => {
    expect(opponentOf({ kind: "live", token: "pd7.e30" })).toBeNull();
  });

  it("Send it back shares your run as the next challenge on the same seed", async () => {
    const copied: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => void copied.push(text) },
    });
    render(
      <HeadToHead
        token={MINE}
        mine={replay(MINE)}
        theirs={opponentOf({ kind: "live", token: THEIRS })!}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send it back" }));
    });
    expect(copied).toEqual([`${URL_BASE}&vs=${MINE}`]);
    expect(screen.getByRole("status").textContent).toBe("Link copied");
  });
});
