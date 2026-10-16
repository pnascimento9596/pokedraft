// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SaveEvent, SpeciesId } from "@/engine";
import { RecordedSaves } from "../RecordedSaves";

const saves: readonly SaveEvent[] = [
  { kind: "save", side: "user", minute: 12, attacker: 4 as SpeciesId, keeper: 7 as SpeciesId },
  { kind: "save", side: "opp", minute: 77, attacker: 25 as SpeciesId, keeper: 1 as SpeciesId },
];

afterEach(cleanup);

describe("RecordedSaves (catches invented saves on old replays and misnamed keepers)", () => {
  it("renders nothing for a retained replay that recorded no save list", () => {
    render(<RecordedSaves saves={undefined} />);
    expect(screen.queryByTestId("recorded-saves")).toBeNull();
  });

  it("says so when the engine recorded an empty save list", () => {
    render(<RecordedSaves saves={[]} />);
    expect(screen.getByText("Recorded saves (0)").textContent).toBe("Recorded saves (0)");
    expect(screen.getByText("No saved attempts recorded in this match.")).toBeTruthy();
  });

  it("lists each recorded save with its side, minute, keeper and shooter", () => {
    render(<RecordedSaves saves={saves} />);
    expect(screen.getByText("Recorded saves (2)").textContent).toBe("Recorded saves (2)");
    expect(
      screen.getAllByRole("listitem").map((li) => [li.getAttribute("data-side"), li.textContent]),
    ).toEqual([
      ["user", "Your XI: 12' Squirtle saves Charmander's shot"],
      ["opp", "Opponent: 77' Bulbasaur saves Pikachu's shot"],
    ]);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("illustrates only the recorded save the viewer picks", () => {
    render(<RecordedSaves saves={saves} illustrate />);
    expect(screen.queryByTestId("save-illustration")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Illustrate save at 77'" }));
    expect(screen.getByTestId("save-illustration").querySelector("figcaption")!.textContent).toBe(
      "Illustration of recorded save. 77' Bulbasaur saves Pikachu's shot.",
    );
  });
});
