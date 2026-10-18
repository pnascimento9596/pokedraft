// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { replay } from "@/engine";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchReplay } from "../MatchReplay";

afterEach(cleanup);
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

// The engine-5 golden cup8 draft under the live engine-6 prefix: G1 is a 1-0 win over Goldenrod
// United (49'), and Santalune Town beat Veilstone United 3-0 in the other G1 fixture.
const LIVE = `pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;

const rows = () =>
  within(screen.getByTestId("replay-standings"))
    .getAllByRole("row")
    .slice(1)
    .map((r) => [...r.querySelectorAll("th, td")].map((c) => c.textContent));

describe("MatchReplay group standings (decision 13: MatchdayLive's table folds into the replay)", () => {
  it("shows the group at kickoff of G1 with nothing played, then the table after the 1-0 at full time", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={0} onClose={() => {}} />);
    expect(rows()).toEqual([
      ["Goldenrod United", "0", "0", "0"],
      ["Santalune Town", "0", "0", "0"],
      ["Veilstone United", "0", "0", "0"],
      ["Your team", "0", "0", "0"],
    ]);
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(rows()).toEqual([
      ["Santalune Town", "1", "3", "3"],
      ["Your team", "1", "1", "3"],
      ["Goldenrod United", "1", "-1", "0"],
      ["Veilstone United", "1", "-3", "0"],
    ]);
  });

  it("shows no group table for a knockout match", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={4} onClose={() => {}} />);
    expect(screen.getByTestId("match-replay-title").textContent).toContain("Coumarine United");
    expect(screen.queryByTestId("replay-standings")).toBeNull();
  });
});
