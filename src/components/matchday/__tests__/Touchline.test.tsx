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
  tacticManaged: false,
  subsManaged: false,
  subsUsed: 2,
  onPitch: [1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 25].map(id),
  energy: [96, 80, 81, 82, 83, 84, 85, 86, 87, 88, 62],
  yellow: [false, false, false, true, false, false, false, false, false, false, false],
  bench: [seat(0, 133), seat(1, 143, false), seat(2, 150), seat(3, 151, false), seat(4, 152)],
  takers: { penalty: null, freeKick: null },
  open: true,
};

describe("Touchline (catches a panel that offers used players or records nothing)", () => {
  it("shows the minute, the sub count and only the bench players who can still come on", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(screen.getByTestId("touchline-minute").textContent).toBe("46'");
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 2 of 5");
    expect(
      [...document.querySelectorAll('[data-testid^="bench-card-"]')].map(
        (c) => c.querySelector("[class*=benchName]")?.textContent,
      ),
    ).toEqual(["Eevee", "Mewtwo", "Chikorita"]);
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
    fireEvent.click(screen.getByTestId("energy-slot-10"));
    fireEvent.click(screen.getByTestId("bench-card-2"));
    fireEvent.click(screen.getByTestId("sub-confirm"));
    expect(onDecide).toHaveBeenCalledWith({ kind: "sub", slot: 10, bench: 2 });
  });

  it("closes the substitution once all five are used, and says the assistant has stepped back", () => {
    render(
      <Touchline
        line={{ ...LINE, subsUsed: 5, tacticManaged: true, subsManaged: true }}
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

describe("Touchline as a phone sheet (catches a collapsed sheet without its tactics, sub count or toggle)", () => {
  it("collapsed: the five tactics, Subs 2 of 5 and a closed toggle that asks to open", () => {
    const onExpand = vi.fn();
    render(
      <Touchline
        line={LINE}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
        sheet={{ expanded: false, onExpand }}
      />,
    );
    const tactics = screen.getByRole("group", { name: "Tactic" });
    expect(tactics.querySelectorAll("button")).toHaveLength(5);
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 2 of 5");
    const toggle = screen.getByTestId("sheet-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toBe("Bench and energy");
    expect(screen.getByTestId("touchline").hasAttribute("data-expanded")).toBe(false);
    fireEvent.click(toggle);
    expect(onExpand).toHaveBeenCalledWith(true);
  });

  it("expanded: the toggle goes back to the match", () => {
    const onExpand = vi.fn();
    render(
      <Touchline
        line={LINE}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
        sheet={{ expanded: true, onExpand }}
      />,
    );
    const toggle = screen.getByTestId("sheet-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Back to the match");
    expect(screen.getByTestId("touchline").hasAttribute("data-expanded")).toBe(true);
    fireEvent.click(toggle);
    expect(onExpand).toHaveBeenCalledWith(false);
  });

  it("has no toggle without a sheet", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(screen.queryByTestId("sheet-toggle")).toBeNull();
  });
});

describe("Touchline intelligence (catches a touchline that hides the assistant's state, the bench's fit or a booking)", () => {
  it("states each half of the assistant's engine 7 behaviour and the matching takeover copy", () => {
    const { rerender } = render(
      <Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />,
    );
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs on, tactics on",
    );
    expect(screen.queryByTestId("takeover")).toBeNull();

    rerender(
      <Touchline
        line={{ ...LINE, tacticManaged: false, subsManaged: true }}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
      />,
    );
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs off, tactics on",
    );
    expect(screen.getByTestId("takeover").textContent).toBe(
      "You're making the subs now. Your assistant still manages tactics.",
    );

    rerender(
      <Touchline
        line={{ ...LINE, tacticManaged: true, subsManaged: false }}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
      />,
    );
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs on, tactics off",
    );
    expect(screen.getByTestId("takeover").textContent).toBe(
      "You have the tactics now. Your assistant still makes fatigue subs.",
    );

    rerender(
      <Touchline
        line={{ ...LINE, tacticManaged: true, subsManaged: true }}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
      />,
    );
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs off, tactics off",
    );
    expect(screen.getByTestId("takeover").textContent).toBe(
      "You have the touchline. Your assistant stops making changes this match.",
    );
  });

  it("picks who goes off by tapping an energy row and who comes on by tapping a bench card, with no Take off select", () => {
    const onDecide = vi.fn();
    render(<Touchline line={LINE} formation="4-3-3" onDecide={onDecide} error={null} />);
    expect(screen.queryByTestId("sub-off")).toBeNull();
    expect(screen.getByTestId("energy-slot-10").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("energy-slot-4"));
    expect(screen.getByTestId("energy-slot-4").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("energy-slot-10").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByTestId("bench-card-2"));
    expect(screen.getByTestId("bench-card-2").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("sub-confirm"));
    expect(onDecide).toHaveBeenCalledWith({ kind: "sub", slot: 4, bench: 2 });
  });

  it("with ratings off, bench cards show the fit glyph for the outgoing slot and no numbers", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(
      ["bench-card-0", "bench-card-2", "bench-card-4"].map(
        (t) => screen.getByTestId(t).querySelector("[data-fit]")?.textContent,
      ),
    ).toEqual(["\u2605 Best", "OK", "Poor"]);
    // The star is a glyph beside the label, so a screen reader hears only "Best".
    expect(
      screen.getByTestId("bench-card-0").querySelector("[data-fit] [aria-hidden='true']")
        ?.textContent,
    ).toBe("\u2605");
    expect(screen.queryByTestId("bench-card-1")).toBeNull();
    for (const t of ["bench-card-0", "bench-card-2", "bench-card-4"]) {
      expect(screen.getByTestId(t).textContent).not.toMatch(/\d/);
    }
    fireEvent.click(screen.getByTestId("energy-slot-4"));
    expect(screen.getByTestId("bench-card-4").querySelector("[data-fit]")?.textContent).toBe(
      "\u2605 Best",
    );
  });

  it("with ratings on, bench cards add the fit score for the outgoing slot and STA", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} ratings />);
    expect(screen.getByTestId("bench-card-0").querySelector("[data-numbers]")?.textContent).toBe(
      "Fit 52, STA 47",
    );
    fireEvent.click(screen.getByTestId("energy-slot-4"));
    expect(screen.getByTestId("bench-card-0").querySelector("[data-numbers]")?.textContent).toBe(
      "Fit 42, STA 47",
    );
  });

  it("puts a yellow card on the booked player's energy row only", () => {
    render(<Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} />);
    expect(screen.getByTestId("energy-slot-3").querySelector("[data-yellow]")).not.toBeNull();
    expect(document.querySelectorAll("[data-yellow]")).toHaveLength(1);
  });

  it("badges each tactic pill against a possession side, and none against a balanced one", () => {
    const { rerender } = render(
      <Touchline
        line={LINE}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
        style="possession"
      />,
    );
    expect(
      ["balanced", "attack", "defend", "press", "counter"].map((t) =>
        screen.getByTestId(`edge-${t}`).getAttribute("data-edge"),
      ),
    ).toEqual(["neutral", "neutral", "unfavourable", "favourable", "favourable"]);
    expect(screen.getByTestId("edge-press").textContent).toBe("\u25b2Edge");
    expect(screen.getByTestId("edge-defend").textContent).toBe("\u25bcAvoid");
    expect(screen.getByTestId("edge-attack").textContent).toBe("=Even");
    rerender(
      <Touchline line={LINE} formation="4-3-3" onDecide={() => {}} error={null} style="balanced" />,
    );
    expect(document.querySelectorAll('[data-testid^="edge-"]')).toHaveLength(0);
  });
});

describe("Touchline set pieces under engine 7 (catches set-piece selects staying hidden after the flip)", () => {
  it("renders Set pieces with Penalty taker and Free-kick taker selects", () => {
    render(
      <Touchline
        line={LINE}
        formation="4-3-3"
        onDecide={() => {}}
        error={null}
        sheet={{ expanded: true, onExpand: () => {} }}
      />,
    );
    expect(screen.getByTestId("set-pieces")).not.toBeNull();
  });
});
