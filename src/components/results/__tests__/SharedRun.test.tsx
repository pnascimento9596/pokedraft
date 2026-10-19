// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharedRun } from "@/components/results/SharedRun";
import { replayAnyVersion } from "@/engine/versions";
import { A11Y_RUN_V1, GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";

afterEach(cleanup);

describe("SharedRun engine label (catches an old-engine run passing as a current one)", () => {
  it("labels a run replayed on an older engine", async () => {
    const run = { ...(await replayAnyVersion(A11Y_RUN_V1)), current: false };
    render(<SharedRun token={A11Y_RUN_V1} run={run} />);
    expect(screen.getByTestId("engine-label").textContent).toBe("Played on engine v1");
    expect(screen.getByTestId("results-record").textContent).toBe("8-0-0");
  });

  it("shows no label for a run on the current engine", async () => {
    const run = { ...(await replayAnyVersion(A11Y_RUN_V1)), current: true };
    render(<SharedRun token={A11Y_RUN_V1} run={run} />);
    expect(screen.queryByTestId("engine-label")).toBeNull();
  });
});

// The engine-5 golden cup8 draft under the live engine-6 prefix: G1 is a 1-0 win with a 49' goal.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;

describe("goal deep link (catches a bad query that breaks the page or a good one that does not open the goal)", () => {
  it("deep link with t=abc renders the normal shared run: at=abc, the minute's name here, opens no replay", async () => {
    const run = { ...(await replayAnyVersion(LIVE)), current: true };
    render(<SharedRun token={LIVE} run={run} watch="0" at="abc" />);
    expect(screen.getByTestId("results-record").textContent).toBe("5-0-1");
    expect(screen.queryByTestId("match-replay")).toBeNull();
  });

  it("watch=0 at=49 opens G1 at 48', a minute before the goal", async () => {
    Element.prototype.scrollIntoView = () => {};
    const run = { ...(await replayAnyVersion(LIVE)), current: true };
    render(<SharedRun token={LIVE} run={run} watch="0" at="49" />);
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    const replay = screen.getByTestId("match-replay");
    expect(replay.textContent).toContain("Goldenrod United");
    expect(within(replay).getByTestId("match-player").getAttribute("data-minute")).toBe("48");
    expect(within(replay).getByTestId("matchday-score").textContent).toBe("0-0");
  });

  it("Share this goal on the 49' result line copies the goal's link", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const run = { ...(await replayAnyVersion(LIVE)), current: true };
    render(<SharedRun token={LIVE} run={run} />);
    const g1 = screen.getByTestId("match-G1");
    await act(async () => {
      fireEvent.click(within(g1).getByRole("button", { name: "Share this goal: 49'" }));
    });
    expect(writeText).toHaveBeenCalledWith(
      `http://localhost:3000/r/pd6?t=${LIVE.slice("pd6.".length)}&watch=0&at=49`,
    );
    expect(within(g1).getByRole("status").textContent).toBe("Link copied");
    vi.unstubAllGlobals();
  });
});
