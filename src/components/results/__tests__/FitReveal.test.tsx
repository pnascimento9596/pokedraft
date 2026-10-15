// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FORMATIONS, FORMATION_IDS, SPECIES, rateTeam, type FullLineup } from "@/engine";
import { createRng } from "@/lib/rng";
import { FitReveal } from "../FitReveal";

afterEach(cleanup);

// Seed finish-2 of `pnpm exec tsx scripts/calibration/play-seeded.mts --n 20` (cup8 Classic 4-3-3,
// the random bot). Slot order: GK, LB, LCB, RCB, RB, CDM, LCM, RCM, LW, ST, RW. Observed on the
// current engine: Team Score 394, weakest LW, RCB, CDM.
const FINISH_2 = {
  formation: "4-3-3",
  starters: [479, 435, 626, 220, 869, 397, 411, 22, 292, 230, 630],
  bench: [924, 564, 597, 784, 909],
} as unknown as FullLineup;

// [slot label, number shown, raw fit] per slot. The number is round(100 * quality), both read off
// the same script output (fit=29 q=0.40487804878048783 for the keeper, and so on).
const FINISH_2_ROWS = [
  ["GK", 40, 29],
  ["LB", 84, 71],
  ["LCB", 92, 85],
  ["RCB", 12, 32],
  ["RB", 42, 53],
  ["CDM", 16, 37],
  ["LCM", 31, 47],
  ["RCM", 43, 55],
  ["LW", 11, 30],
  ["ST", 64, 63],
  ["RW", 33, 44],
] as const;

// Renders the card and reads each row the way a person would: the one bare number on it, and
// whether it carries the Weak spot tag.
function show(lineup: FullLineup) {
  render(<FitReveal formation={lineup.formation} rating={rateTeam(lineup)} />);
  return FORMATIONS[lineup.formation].slots.map((slot) => {
    const row = screen.getByTestId(`fit-${slot.id}`);
    return {
      label: slot.label,
      row,
      number: Number(within(row).getByText(/^\d+$/).textContent),
      weak: within(row).queryByText("Weak spot") !== null,
    };
  });
}

describe("FitReveal", () => {
  it("includes all five bench players with their actual best roles and individual Scout actions", () => {
    const onScout = vi.fn();
    render(
      <FitReveal
        formation={FINISH_2.formation}
        rating={rateTeam(FINISH_2)}
        bench={FINISH_2.bench}
        onScout={onScout}
      />,
    );
    const bench = screen.getByRole("list", { name: "Bench scouting" });
    expect(within(bench).getAllByRole("listitem")).toHaveLength(5);
    expect(
      within(bench)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "Scout Tandemaus",
      "Scout Tirtouga",
      "Scout Ferroseed",
      "Scout Kommo-o",
      "Scout Fuecoco",
    ]);
    expect(within(bench).getByText("Best roles: W, WM, WB")).toBeTruthy();
    fireEvent.click(within(bench).getByRole("button", { name: "Scout Fuecoco" }));
    expect(onScout).toHaveBeenCalledExactlyOnceWith(909);
  });

  it("opens the selected starter dossier from its own Scout control", () => {
    const onScout = vi.fn();
    render(
      <FitReveal formation={FINISH_2.formation} rating={rateTeam(FINISH_2)} onScout={onScout} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Scout Rotom" }));
    expect(onScout).toHaveBeenCalledExactlyOnceWith(479);
    expect(screen.getAllByRole("button", { name: /^Scout / })).toHaveLength(11);
  });

  it("prints each player's quality against the role, not the raw fit (catches the card showing a number the engine does not rank by)", () => {
    const rows = show(FINISH_2);
    expect(rows.map((r) => [r.label, r.number])).toEqual(
      FINISH_2_ROWS.map(([label, shown]) => [label, shown]),
    );
  });

  it("flags exactly the three lowest numbers shown (catches a Weak spot tag on a row whose number is higher than an unflagged row's)", () => {
    const rows = show(FINISH_2);
    // The old card showed raw fit: the keeper's 29 was the lowest number in the XI and carried no
    // tag, while the CDM's 37 was tagged. Quality ranks them the other way round.
    expect(rows.filter((r) => r.weak).map((r) => [r.label, r.number])).toEqual([
      ["RCB", 12],
      ["CDM", 16],
      ["LW", 11],
    ]);
    expect(Math.min(...rows.filter((r) => !r.weak).map((r) => r.number))).toBe(31);
    const gk = rows[0]!;
    expect([gk.label, gk.number, gk.weak]).toEqual(["GK", 40, false]);
  });

  it("labels the number with who it is compared to, and reads the same quantity to a screen reader", () => {
    const rows = show(FINISH_2);
    expect(within(rows[0]!.row).getByText("vs other keepers")).toBeTruthy();
    expect(
      within(rows[0]!.row).getByText("Quality 40, better than about 40 of every 100 other keepers"),
    ).toBeTruthy();
    expect(within(rows[3]!.row).getByText("vs other CBs")).toBeTruthy();
    expect(
      within(rows[3]!.row).getByText("Quality 12, better than about 12 of every 100 other CBs"),
    ).toBeTruthy();
    expect(within(rows[8]!.row).getByText("vs other wingers")).toBeTruthy();
  });

  it("keeps the raw fit inside the Scouting notes, one tap away, and off the card face", () => {
    const rows = show(FINISH_2);
    const raw = rows.map((r) => within(r.row).getByText(/^Raw fit /));
    expect(raw.map((el) => el.textContent)).toEqual(
      FINISH_2_ROWS.map(([label, , fit]) => `Raw fit ${fit} of 100 for ${label}`),
    );
    for (const el of raw) {
      expect(el.closest("details")?.querySelector("summary")?.textContent).toBe("Scouting notes");
    }
    // The CDM's raw fit used to be the bare number on the card; now only the notes say 37.
    expect(within(rows[5]!.row).queryByText("37")).toBeNull();
  });

  it("flags three numbers no higher than any unflagged one, on every formation (four random squads each)", () => {
    const pool = SPECIES.map((s) => s.id);
    for (const formation of FORMATION_IDS) {
      for (let n = 0; n < 4; n++) {
        const rng = createRng(`fit-reveal:${formation}:${n}`);
        const left = [...pool];
        const take = () => left.splice(rng.int(left.length), 1)[0]!;
        const lineup = {
          formation,
          starters: Array.from({ length: 11 }, take),
          bench: Array.from({ length: 5 }, take),
        } as unknown as FullLineup;
        const rows = show(lineup);
        const flagged = rows.filter((r) => r.weak).map((r) => r.number);
        const others = rows.filter((r) => !r.weak).map((r) => r.number);
        expect(flagged).toHaveLength(3);
        expect(Math.max(...flagged)).toBeLessThanOrEqual(Math.min(...others));
        cleanup();
      }
    }
  });
});
