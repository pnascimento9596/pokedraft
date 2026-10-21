// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { decodeToken, replay } from "@/engine";
import { RoadStrip } from "../RoadStrip";
import { GOLDEN_1_KANTO151 } from "./ladders";

afterEach(cleanup);

// A complete engine-3 run cut with a scratch script (the scriptedToken fixture): cup8 Open 4-3-3
// Squad First, seed "road-5". Observed 4-0-1, out in the Round of 16, so three of its eight
// matches are Not played and still name their opponent.
const ROAD_5 =
  "pd7.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwicm9hZC01IixbWyJwIiw3NzYsInMwIl0sWyJwIiw5NzQsInMxIl0sWyJwIiwzNjEsInMyIl0sWyJwIiw0OTUsInMzIl0sWyJwIiwzOTUsInM0Il0sWyJwIiwyMDUsInM1Il0sWyJwIiwyNywiczYiXSxbInAiLDcyMiwiczciXSxbInAiLDkzMSwiczgiXSxbInAiLDE2LCJzOSJdLFsicCIsNzY1LCJzMTAiXSxbInAiLDQzMCwiYjAiXSxbInAiLDkyLCJiMSJdLFsicCIsNjkxLCJiMiJdLFsicCIsNjU1LCJiMyJdLFsicCIsMTcsImI0Il1dXQ";

const ratings = () => screen.queryAllByText(/, rating \d+$/).map((el) => el.textContent);

describe("RoadStrip", () => {
  it("prints the tooltip's Rating row as the bare number (catches Rating / Rating 267)", () => {
    const { container } = render(<RoadStrip seed="golden-1" mode="kanto151" />);
    const rows = Array.from(container.querySelectorAll(".theme-tooltip__row"))
      .map((row) => [row.children[0]!.textContent, row.children[1]!.textContent])
      .filter(([key]) => key === "Rating");
    expect(rows.map(([, value]) => value)).toEqual([
      "267",
      "302",
      "346",
      "489",
      "601",
      "749",
      "859",
      "1000",
    ]);
  });

  it("reads out the club and exact rating of this seed's opponent in every round (catches the nominal ladder standing in for the run)", () => {
    render(<RoadStrip seed="golden-1" mode="kanto151" />);
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    expect(screen.queryByText(/approximate/i)).toBeNull();
    expect(screen.getByText("Your opponents")).toBeTruthy();
  });

  it("prints each exact rating above its bar and sizes the bar by it (catches numbers or bars still read from the nominal table)", () => {
    render(<RoadStrip seed="golden-1" mode="kanto151" />);
    // The tooltip's Rating row prints the same bare number; this reads only the bar labels.
    const barLabels = screen
      .getAllByText(/^\d{3,4}$/)
      .filter((el) => el.closest('[role="tooltip"]') === null);
    expect(barLabels.map((el) => el.textContent)).toEqual([
      "267",
      "302",
      "346",
      "489",
      "601",
      "749",
      "859",
      "1000",
    ]);
    const heights = screen
      .getAllByRole("listitem")
      .map((li) => Number(li.style.getPropertyValue("--h")).toFixed(3));
    expect(heights).toEqual([
      "0.267",
      "0.302",
      "0.346",
      "0.489",
      "0.601",
      "0.749",
      "0.859",
      "1.000",
    ]);
  });

  it("prints no number and no 'approximate' before a seed exists, and says the opponents are set at the start (catches a nominal number on a fresh start screen)", () => {
    const { container } = render(<RoadStrip seed={null} mode="cup8" />);
    expect(container.textContent).not.toMatch(/\d{3}/);
    expect(screen.queryByText(/approximate/i)).toBeNull();
    expect(screen.queryByText(/rating/i)).toBeNull();
    expect(screen.getByText("Your opponents are set the moment you start the run.")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("keeps the same eight-step markup with and without a seed, so the strip does not change height (catches a collapsing value row)", () => {
    const steps = (container: HTMLElement) =>
      [...container.querySelectorAll("li")].map((li) =>
        [...li.children].map((el) => `${el.tagName}.${el.className}`),
      );
    const seeded = render(<RoadStrip seed="golden-1" mode="kanto151" />);
    const withNumbers = steps(seeded.container);
    seeded.unmount();
    const unseeded = render(<RoadStrip seed={null} mode="kanto151" />);
    const withoutNumbers = steps(unseeded.container);
    expect(withoutNumbers).toHaveLength(8);
    expect(withoutNumbers).toEqual(withNumbers);
    // An empty cell has no line box, so the row would shrink; a space keeps its height.
    const cells = [...unseeded.container.querySelectorAll("li > :first-child")];
    expect(cells.map((cell) => (cell.textContent ?? "").length > 0)).toEqual(Array(8).fill(true));
  });

  it("describes the even knockout climb, not the old cliff before the quarter-final", () => {
    render(<RoadStrip seed="golden-1" mode="kanto151" />);
    expect(screen.getByText(/every knockout round is a step up/)).toBeTruthy();
    expect(screen.queryByText(/warm-up/)).toBeNull();
  });

  it("drops the caption but keeps every rating in the compact strip", () => {
    const { container } = render(<RoadStrip seed="golden-1" mode="kanto151" compact />);
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    expect(screen.queryByText(/every knockout round/)).toBeNull();
    expect(container.querySelector("[data-compact]")).not.toBeNull();
  });

  it("shows, round by round, the rating of the opponent the engine's cup plays for the same run (catches the strip drifting from the cup)", () => {
    const { seed, settings } = decodeToken(ROAD_5);
    const { cup } = replay(ROAD_5);
    expect(cup.matches.map((m) => [m.round, m.status])).toEqual([
      ["G1", "played"],
      ["G2", "played"],
      ["G3", "played"],
      ["R32", "played"],
      ["R16", "played"],
      ["QF", "notPlayed"],
      ["SF", "notPlayed"],
      ["F", "notPlayed"],
    ]);
    render(<RoadStrip seed={seed} mode={settings.mode} />);
    const shown = ratings().map((line) => line!.split(", ").slice(1).join(", "));
    expect(shown).toEqual(cup.matches.map((m) => `${m.opponent.name}, rating ${m.opponent.score}`));
    expect(ratings()[4]).toBe("Round of 16, Wyndon FC, rating 600");
    expect(ratings()[7]).toBe("Final, Konikoni Athletic, rating 981");
  });
});
