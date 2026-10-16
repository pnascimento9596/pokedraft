// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BenchIndex, SpeciesId } from "@/engine/types";
import type { Touchline as TouchlineState } from "@/ui/manager/touchline";
import { TAKEOVER_COPY, Touchline } from "../Touchline";

afterEach(cleanup);

const id = (n: number) => n as SpeciesId;
const seat = (index: number, species: number, available = true) => ({
  index: index as BenchIndex,
  species: id(species),
  available,
});

// 4-3-3 eleven: Bulbasaur (1) in goal, Pikachu (25) as the last starter, slot 10.
const LINE: TouchlineState = {
  minute: 46,
  tactic: "balanced",
  managed: false,
  subsUsed: 2,
  onPitch: [1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 25].map(id),
  energy: [96, 80, 81, 82, 83, 84, 85, 86, 87, 88, 62],
  bench: [seat(0, 133), seat(1, 143, false), seat(2, 150), seat(3, 151, false), seat(4, 152)],
  open: true,
};

describe("Touchline (catches a panel that offers used players or records nothing)", () => {
  it("shows the minute, the sub count and only the bench players who can still come on", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(screen.getByTestId("touchline-minute").textContent).toBe("46'");
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 2 of 5");
    const on = screen.getByTestId("sub-on") as HTMLSelectElement;
    expect([...on.options].map((o) => o.textContent)).toEqual(["Eevee", "Mewtwo", "Chikorita"]);
    expect(screen.queryByTestId("takeover")).toBeNull();
    expect(screen.getByTestId("tactic-balanced").getAttribute("aria-pressed")).toBe("true");
  });

  it("records a tactic change and ignores a tap on the tactic already in play", () => {
    const onDecide = vi.fn();
    render(<Touchline line={LINE} formation="4-3-3" onDecide={onDecide} error={null} />);
    fireEvent.click(screen.getByTestId("tactic-balanced"));
    expect(onDecide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("tactic-attack"));
    expect(onDecide).toHaveBeenCalledWith({ kind: "tactic", tactic: "attack" });
  });

  it("records the picked substitution by slot and bench seat", () => {
    const onDecide = vi.fn();
    render(<Touchline line={LINE} formation="4-3-3" onDecide={onDecide} error={null} />);
    fireEvent.change(screen.getByTestId("sub-off"), { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("sub-on"), { target: { value: "2" } });
    fireEvent.click(screen.getByTestId("sub-confirm"));
    expect(onDecide).toHaveBeenCalledWith({ kind: "sub", slot: 10, bench: 2 });
  });

  it("closes the substitution once all five are used, and says the assistant has stepped back", () => {
    render(
      <Touchline
        line={{ ...LINE, subsUsed: 5, managed: true }}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
      />,
    );
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 5 of 5");
    expect((screen.getByTestId("sub-confirm") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("takeover").textContent).toBe(TAKEOVER_COPY);
    expect(TAKEOVER_COPY).toBe(
      "You have the touchline. Your assistant stops making changes this match.",
    );
  });

  it("disables every control after the final whistle and shows a refusal as an alert", () => {
    render(
      <Touchline
        line={{ ...LINE, open: false }}
        formation="4-3-3"
        onDecide={() => {}}
        error="The match is over."
      />,
    );
    expect((screen.getByTestId("tactic-attack") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("sub-confirm") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toBe("The match is over.");
  });
});
