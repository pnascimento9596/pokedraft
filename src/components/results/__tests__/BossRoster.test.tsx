// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type Opponent, type SpeciesId, type Shirt } from "@/engine";
import { BossRoster } from "../BossRoster";

afterEach(cleanup);

const boss: Opponent = {
  id: "fire-club", name: "Fire Club", score: 500,
  lines: { GK: 50, DEF: 50, MID: 50, ATT: 50 },
  roster: [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136].map((id) => ({ kind: "species", id: id as SpeciesId })),
};

describe("BossRoster", () => {
  it("lets players expand the whole Boss XI with species, assigned roles, type identity and formation", () => {
    render(<BossRoster opponent={boss} />);
    const summary = screen.getByText("Boss XI");
    expect(summary.closest("details")).toBeTruthy();
    expect(screen.getByText("4-3-3")).toBeTruthy();
    expect(screen.getByText("Fire theme")).toBeTruthy();
    const roster = screen.getByRole("list", { name: "Fire Club starting eleven", hidden: true });
    expect(within(roster).getAllByRole("listitem", { hidden: true })).toHaveLength(11);
    expect(within(roster).getByText("Charmander")).toBeTruthy();
    expect(within(roster).getByText("Flareon")).toBeTruthy();
    expect(within(roster).getByText("GK")).toBeTruthy();
    expect(within(roster).getByText("RW")).toBeTruthy();
    expect(within(roster).getAllByRole("img", { hidden: true })).toHaveLength(11);
  });

  it("labels retained opponents as shirt numbers without inventing species, theme or formation", () => {
    render(<BossRoster opponent={{ ...boss, roster: Array.from({ length: 11 }, (_, i) => ({ kind: "shirt", number: (i + 1) as Shirt })) }} />);
    expect(screen.getByText("Opponent shirts")).toBeTruthy();
    expect(screen.getByText("Retained run: this engine recorded shirt numbers, without Pokémon identities or a formation.")).toBeTruthy();
    expect(screen.getByText("No. 1")).toBeTruthy();
    expect(screen.getByText("No. 11")).toBeTruthy();
    expect(screen.queryByText("4-3-3")).toBeNull();
    expect(screen.queryByText("Fire theme")).toBeNull();
  });
});
