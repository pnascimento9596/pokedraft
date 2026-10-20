// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BenchIndex, SpeciesId } from "@/engine/types";
import type { Touchline as TouchlineState } from "@/ui/manager/touchline";
import { Touchline } from "../Touchline";

// Engine 7 switches the control on with missable penalties; this stands in for the flip.
vi.mock("@/ui/manager/touchline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui/manager/touchline")>()),
  SET_PIECES_ON: true,
}));

afterEach(cleanup);

const id = (n: number) => n as SpeciesId;
const seat = (index: number, species: number) => ({
  index: index as BenchIndex,
  species: id(species),
  available: true,
});

// 4-3-3 eleven: Bulbasaur (1) in goal, Pikachu (25) as the last starter, slot 10.
const LINE: TouchlineState = {
  minute: 46,
  tactic: "balanced",
  managed: false,
  subsUsed: 0,
  onPitch: [1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 25].map(id),
  energy: [96, 80, 81, 82, 83, 84, 85, 86, 87, 88, 62],
  yellow: Array.from({ length: 11 }, () => false),
  bench: [seat(0, 133), seat(1, 143), seat(2, 150), seat(3, 151), seat(4, 152)],
  takers: { penalty: 10, freeKick: null },
  open: true,
};

const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;

describe("Touchline set pieces (catches a stop that forgets or cannot change the nominee)", () => {
  it("shows the current nominee: Pikachu on penalties, Auto on free kicks", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(select("taker-penalty").value).toBe("10");
    expect(select("taker-penalty").selectedOptions[0]!.textContent).toBe("Pikachu (RW)");
    expect(select("taker-freeKick").value).toBe("auto");
  });

  it("records a free-kick taker and a return to Auto", () => {
    const onDecide = vi.fn();
    render(<Touchline line={LINE} formation="4-3-3" onDecide={onDecide} error={null} />);
    fireEvent.change(select("taker-freeKick"), { target: { value: "9" } });
    expect(onDecide).toHaveBeenCalledWith({ kind: "taker", set: "freeKick", slot: 9 });
    fireEvent.change(select("taker-penalty"), { target: { value: "auto" } });
    expect(onDecide).toHaveBeenCalledWith({ kind: "taker", set: "penalty", slot: null });
  });

  it("is disabled after the final whistle", () => {
    render(
      <Touchline
        line={{ ...LINE, open: false }}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
      />,
    );
    expect((screen.getByTestId("set-pieces") as HTMLFieldSetElement).disabled).toBe(true);
  });
});
