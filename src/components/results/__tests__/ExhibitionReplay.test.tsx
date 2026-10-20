// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FullLineup, Seed } from "@/engine";
import { ExhibitionReplay } from "../ExhibitionReplay";

// Moved from ExhibitionMatchModal.test.tsx with the replay. The route keeps legs and the rematch
// counter in the URL; here they live in state, so a press reaches the replay the way a
// router.replace would.
const lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  bench: [12, 13, 14, 15, 16],
} as unknown as FullLineup;

function Harness({ seed = "opponent-0" as Seed }: { readonly seed?: Seed }) {
  const [legs, setLegs] = useState<1 | 2>(1);
  const [rematch, setRematch] = useState(0);
  return (
    <ExhibitionReplay
      home={lineup}
      away={lineup}
      seed={seed}
      rematch={rematch}
      legs={legs}
      awayName="Their squad"
      mirror={false}
      onLegs={setLegs}
      onRematch={() => setRematch((n) => n + 1)}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("exhibition highlights", () => {
  it("replays only genuine goals when their minutes arrive and restores the recorded final score", () => {
    render(<Harness />);
    // Engine 6: 4-1, goals at 23', 37' (Their squad), 44', 78' and 85'.
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4-1");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toContain(
      "37' Caterpie, assist Charmeleon",
    );
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0-0");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("");
    for (let i = 0; i < 25; i++)
      act(() => {
        vi.advanceTimersByTime(80);
      });
    // 25 ticks of 3 minutes reach 75': the 78' and 85' goals are not revealed yet.
    expect(screen.getByTestId("exhibition-score").textContent).toBe("2-1");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe(
      "Your squad23' Charizard (solo run)Their squad37' Caterpie, assist CharmeleonYour squad44' Venusaur",
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause highlights" }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByTestId("exhibition-score").textContent).toBe("2-1");
    fireEvent.click(screen.getByRole("button", { name: "Show full time" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4-1");
    expect(screen.getByRole("status").textContent).toBe("Full time. Your squad wins.");
    expect(localStorage.length).toBe(0);
  });

  it("resets highlights for rematches and clears a running replay on unmount", () => {
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByRole("status").textContent).toBe("0' / 90' Replay of recorded goals.");
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.getByRole("button", { name: "Replay highlights" }).textContent).toBe(
      "Replay highlights",
    );
    expect(screen.getByRole("status").textContent).toContain("Full time.");
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps focus on Play rematch after a rematch (catches a remount that drops keyboard focus)", () => {
    render(<Harness />);
    const rematch = screen.getByRole("button", { name: "Play rematch" });
    rematch.focus();
    fireEvent.click(rematch);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0-1");
  });
});

it("keeps scoreless draws honest and finishes the replay without creating events", () => {
  // Engine 6 has no goalless mirror match; seed scoreless-9 is the first 0-0.
  render(<Harness seed={"scoreless-9" as Seed} />);
  expect(screen.getByTestId("exhibition-score").textContent).toBe("0-0");
  expect(screen.getByRole("status").textContent).toBe("Full time. Honours even.");
  fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
  for (let i = 0; i < 30; i++)
    act(() => {
      vi.advanceTimersByTime(80);
    });
  expect(screen.getByRole("status").textContent).toBe("Full time. Honours even.");
  expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("");
  expect(screen.getByText("No goals in this match.").textContent).toBe("No goals in this match.");
  expect(vi.getTimerCount()).toBe(0);
});

describe("two-leg exhibition", () => {
  it("shows both legs, the aggregate and a penalty decision, and the one-match result is unchanged", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "One match" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    // Rematch 1 is the first tie of these squads that goes to penalties under engine 6.
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0-1");
    fireEvent.click(screen.getByRole("button", { name: "Two legs" }));
    expect(screen.getByTestId("exhibition-leg-1-score").textContent).toBe("0-2");
    expect(screen.getByTestId("exhibition-leg-2-score").textContent).toBe("2-0");
    expect(screen.getByTestId("exhibition-aggregate").textContent).toBe("2-2");
    expect(screen.getByTestId("exhibition-decided").textContent).toBe("On penalties");
    expect(screen.getByRole("region", { name: "Aggregate" }).textContent).toBe(
      "Aggregate 2-2On penalties. Their squad wins the tie.",
    );
    expect(screen.getAllByRole("status").map((status) => status.textContent)).toEqual([
      "Leg 1 full time. Their squad wins the leg.",
      "Leg 2 after extra time. Penalties: 4-5 on pens.",
    ]);
    expect(screen.queryByTestId("exhibition-score")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "One match" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0-1");
    expect(localStorage.length).toBe(0);
  });

  it("replays leg 2 through extra time and hides the aggregate until both legs reach full time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Two legs" }));
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    const leg2 = within(screen.getByRole("region", { name: "Leg 2" }));
    fireEvent.click(leg2.getByRole("button", { name: "Replay highlights" }));
    expect(leg2.getByRole("status").textContent).toBe("0' / 120' Replay of recorded goals.");
    expect(screen.queryByTestId("exhibition-aggregate")).toBeNull();
    expect(screen.getByRole("region", { name: "Aggregate" }).textContent).toBe(
      "The aggregate shows when both legs are at full time.",
    );
    for (let i = 0; i < 40; i++)
      act(() => {
        vi.advanceTimersByTime(80);
      });
    expect(leg2.getByRole("status").textContent).toBe(
      "Leg 2 after extra time. Penalties: 4-5 on pens.",
    );
    expect(screen.getByTestId("exhibition-aggregate").textContent).toBe("2-2");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays a fresh tie on rematch and settles it on aggregate without extra time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Two legs" }));
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    // Rematch 3: 0-0, then 0-1, so leg 2 settles the tie inside 90 minutes.
    expect(screen.getByTestId("exhibition-leg-1-score").textContent).toBe("0-0");
    expect(screen.getByTestId("exhibition-leg-2-score").textContent).toBe("0-1");
    expect(screen.getByTestId("exhibition-aggregate").textContent).toBe("0-1");
    expect(screen.getByTestId("exhibition-decided").textContent).toBe("On aggregate");
    expect(screen.getAllByRole("status")[1]!.textContent).toBe(
      "Leg 2 full time. Their squad wins the leg.",
    );
  });
});
