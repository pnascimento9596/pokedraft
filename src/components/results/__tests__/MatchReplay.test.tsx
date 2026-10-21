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
const LIVE = `pd7.${GOLDEN_CUP8_V5.slice("pd5.".length)}`;

const rows = () =>
  within(screen.getByTestId("replay-standings"))
    .getAllByRole("row")
    .slice(1)
    .map((r) => [...r.querySelectorAll("th, td")].map((c) => c.textContent));

describe("MatchReplay group standings (decision 13: MatchdayLive's table folds into the replay)", () => {
  it("names the shared run's side This squad in the table (catches Your team on a friend's link)", () => {
    const { draft, cup } = replay(LIVE);
    render(
      <MatchReplay
        cup={cup}
        draft={draft}
        matchIndex={0}
        manager={[]}
        variant="shared"
        onClose={() => {}}
      />,
    );
    expect(rows().map(([team]) => team)).toEqual([
      "Goldenrod United",
      "Santalune Town",
      "Veilstone United",
      "This squad",
    ]);
  });

  it("shows the group at kickoff of G1 with nothing played, then the table after the 1-0 at full time", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={0} manager={[]} onClose={() => {}} />);
    expect(rows()).toEqual([
      ["Goldenrod United", "0", "0", "0"],
      ["Santalune Town", "0", "0", "0"],
      ["Veilstone United", "0", "0", "0"],
      ["Your team", "0", "0", "0"],
    ]);
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(rows()).toEqual([
      ["Santalune Town", "1", "3", "3"],
      ["Your team", "1", "3", "3"],
      ["Goldenrod United", "1", "-3", "0"],
      ["Veilstone United", "1", "-3", "0"],
    ]);
  });

  it("shows no group table for a knockout match", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={4} manager={[]} onClose={() => {}} />);
    expect(screen.getByTestId("match-replay-title").textContent).toContain("Coumarine United");
    expect(screen.queryByTestId("replay-standings")).toBeNull();
  });
});

describe("MatchReplay on a shared run (catches the shared match player still saying Your XI and Your assistant)", () => {
  const scoreboardTeam = () =>
    screen.getByTestId("matchday-scoreboard").querySelector("span")?.textContent;
  const momentum = () =>
    screen.getByRole("meter", { name: "Match momentum" }).getAttribute("aria-valuetext");

  it("names the shared side This squad on the scoreboard, the momentum meter and the ticker", () => {
    const { draft, cup } = replay(LIVE);
    render(
      <MatchReplay
        cup={cup}
        draft={draft}
        matchIndex={0}
        manager={[]}
        variant="shared"
        onClose={() => {}}
      />,
    );
    expect(scoreboardTeam()).toBe("This squad");
    expect(momentum()).toBe("This squad 50%");
    fireEvent.click(screen.getByTestId("skip-ft"));
    const ticker = screen.getByTestId("ticker").textContent ?? "";
    expect(ticker).toContain("75' This squad's assistant switches to Defend");
    expect(ticker).not.toContain("Your");
  });

  it("writes Goal for this squad! in lower case mid-sentence (catches Goal for This squad!)", () => {
    const { draft, cup } = replay(LIVE);
    render(
      <MatchReplay
        cup={cup}
        draft={draft}
        matchIndex={0}
        manager={[]}
        variant="shared"
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-ft"));
    const ticker = screen.getByTestId("ticker").textContent ?? "";
    expect(ticker).toContain("49' Goal for this squad!");
    expect(ticker).not.toContain("This squad!");
  });

  it("keeps Your XI, Your side and Your assistant on the live run", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={0} manager={[]} onClose={() => {}} />);
    expect(scoreboardTeam()).toBe("Your XI");
    expect(momentum()).toBe("Your side 50%");
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.getByTestId("ticker").textContent).toContain(
      "75' Your assistant switches to Defend",
    );
  });
});

describe("MatchReplay xG river and commentary (catches a river or a ticker line the engine did not roll)", () => {
  const river = () => screen.getByTestId("xg-river");
  const notes = () => screen.queryAllByTestId("ticker-note").map((n) => n.textContent);

  it("starts the river empty and fills it to the match's chances at full time", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={0} manager={[]} onClose={() => {}} />);
    expect(river().getAttribute("role")).toBe("img");
    expect(river().getAttribute("aria-label")).toBe("Chances so far: you 0.0, them 0.0");
    expect(river().textContent).toContain("Chances (xG)");
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(river().getAttribute("aria-label")).toBe("Chances so far: you 5.9, them 0.1");
  });

  it("names a shared run's side this squad in the river's label", () => {
    const { draft, cup } = replay(LIVE);
    render(
      <MatchReplay
        cup={cup}
        draft={draft}
        matchIndex={0}
        manager={[]}
        variant="shared"
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(river().getAttribute("aria-label")).toBe("Chances so far: this squad 5.9, them 0.1");
  });

  it("draws no river for a run a retained engine played", () => {
    const { draft, cup } = replay(LIVE);
    const retained = { ...cup, engine: "pokedraft-engine-5" as const };
    render(
      <MatchReplay cup={retained} draft={draft} matchIndex={0} manager={[]} onClose={() => {}} />,
    );
    expect(screen.queryByTestId("xg-river")).toBeNull();
  });

  it("calls Zeraora's second and hat-trick in G2", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={1} manager={[]} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(notes()).toEqual(["Zeraora's hat-trick", "Zeraora's second"]);
  });

  it("calls the quarter-final's 86' equaliser late drama, Tapu Koko's second and against the run of play", () => {
    const { draft, cup } = replay(LIVE);
    render(<MatchReplay cup={cup} draft={draft} matchIndex={5} manager={[]} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(notes()).toEqual([
      "Late drama at 86'",
      "Tapu Koko's second",
      "Against the run of play",
      "Against the run of play",
    ]);
  });
});
