// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SquadFeedback } from "../SquadFeedback";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import type { Lineup, SpeciesId, SynergyEdge } from "@/engine/types";
import { emptyLineup } from "@/ui/lineup";

const slots = FORMATIONS["4-3-3"].slots;
const lineup: Lineup = {
  ...emptyLineup("4-3-3"),
  starters: [1, 2, 4, null, null, null, null, null, null, null, null] as Lineup["starters"],
};
const edges: readonly SynergyEdge[] = [
  { a: slots[0].id, b: slots[1].id, reasons: ["sharedType", "evoLine", "sameGen"], value: 0.875 },
  { a: slots[1].id, b: slots[2].id, reasons: ["coverage"], value: 0.123 },
];

function mount(current = lineup, currentEdges = edges) {
  return render(<SquadFeedback lineup={current} edges={currentEdges} speciesOf={speciesById} onScout={() => {}} />);
}

afterEach(cleanup);

describe("squad chemistry inspector", () => {
  it("lists named current starter links and filters by actual typed reasons", () => {
    mount();
    const summary = screen.getByText("Chemistry links (2)");
    expect(summary.closest("details")?.open).toBe(false);
    fireEvent.click(summary);
    const inspector = summary.closest("details")!;
    expect(within(inspector).getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Bulbasaur (GK) + Ivysaur (LB)Shared Type · Evo Line · Same Region",
      "Ivysaur (LB) + Charmander (LCB)Type Cover",
    ]);
    fireEvent.click(within(inspector).getByRole("button", { name: "Evo Line" }));
    expect(within(inspector).getAllByRole("listitem")).toHaveLength(1);
    expect(within(inspector).getByRole("button", { name: "Evo Line" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(inspector).getByRole("button", { name: "Type Cover" }));
    expect(within(inspector).getAllByRole("listitem")[0]?.textContent).toBe("Ivysaur (LB) + Charmander (LCB)Type Cover");
    fireEvent.click(within(inspector).getByRole("button", { name: "All links" }));
    expect(within(inspector).getAllByRole("listitem")).toHaveLength(2);
    expect(inspector.textContent).not.toContain("0.875");
    expect(inspector.textContent).not.toContain("0.123");
  });

  it("honestly reports no occupied adjacent links and links with no bonus reasons", () => {
    const { rerender } = mount(emptyLineup("4-3-3"), []);
    expect(screen.getByText("No adjacent starters yet. Place players in connected positions to inspect their links.").textContent).toContain("No adjacent starters yet.");
    rerender(<SquadFeedback lineup={lineup} edges={[{ ...edges[0]!, reasons: [], value: 0 }]} speciesOf={speciesById} onScout={() => {}} />);
    expect(screen.getByText("No chemistry bonus").textContent).toBe("No chemistry bonus");
    expect(screen.getByText("Bulbasaur (GK) + Ivysaur (LB)").textContent).toBe("Bulbasaur (GK) + Ivysaur (LB)");
  });

  it("replaces player names after the lineup changes and keeps stale filters honest", () => {
    const { rerender } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Evo Line", hidden: true }));
    const next: Lineup = { ...lineup, starters: [7 as SpeciesId, ...lineup.starters.slice(1)] as Lineup["starters"] };
    rerender(<SquadFeedback lineup={next} edges={[edges[1]!]} speciesOf={speciesById} onScout={() => {}} />);
    expect(screen.getByText("No current links match this reason.").textContent).toBe("No current links match this reason.");
    fireEvent.click(screen.getByRole("button", { name: "All links", hidden: true }));
    expect(screen.getByText("Ivysaur (LB) + Charmander (LCB)").textContent).toContain("Charmander");
    expect(screen.queryByText("Bulbasaur (GK) + Ivysaur (LB)")).toBeNull();
  });
});
