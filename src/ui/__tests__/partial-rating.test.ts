import { describe, expect, it } from "vitest";
import { applyAction, createDraft, type Seed, type SpeciesId } from "@/engine";
import { previewCandidateEdges, ratePartialLineup } from "../partial-rating";

describe("ratePartialLineup (live chemistry and legendary count during draft and builder)", () => {
  it("computes active synergy edges and live chemistry as soon as two adjacent starters are placed", () => {
    let draft = createDraft(
      { mode: "builder", formation: "4-3-3", gens: [1, 2, 3], legendaries: true },
      "partial-test" as Seed,
    );
    expect(ratePartialLineup(draft.lineup)).toEqual({
      edges: [],
      synergy: null,
      specialCount: 0,
      filledStarters: 0,
    });

    // Place Bulbasaur (#1) at LCB (index 2) and Ivysaur (#2) at RCB (index 3)
    draft = applyAction(draft, {
      type: "place",
      species: 1 as SpeciesId,
      slot: { kind: "starter", index: 2 },
    });
    draft = applyAction(draft, {
      type: "place",
      species: 2 as SpeciesId,
      slot: { kind: "starter", index: 3 },
    });
    const partial = ratePartialLineup(draft.lineup);
    expect(partial.filledStarters).toBe(2);
    expect(partial.edges).toEqual([
      {
        a: "4-3-3.LCB",
        b: "4-3-3.RCB",
        reasons: ["sharedType", "evoLine", "sameGen", "coverage"],
        value: 1,
      },
    ]);
    expect(partial.synergy).toBeGreaterThan(0);
  });

  it("counts special (legendary and mythical) players across starters and bench", () => {
    let draft = createDraft(
      { mode: "builder", formation: "4-3-3", gens: [1], legendaries: true },
      "special-count" as Seed,
    );
    draft = applyAction(draft, {
      type: "place",
      species: 150 as SpeciesId,
      slot: { kind: "starter", index: 9 },
    });
    draft = applyAction(draft, {
      type: "place",
      species: 151 as SpeciesId,
      slot: { kind: "bench", index: 0 },
    });
    expect(ratePartialLineup(draft.lineup).specialCount).toBe(2);
  });

  it("previews candidate synergy links between empty starter slots and adjacent placed teammates", () => {
    let draft = createDraft(
      { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
      "preview-test" as Seed,
    );
    // Place Bulbasaur (#1) at LCB (index 2)
    draft = applyAction(draft, {
      type: "place",
      species: 1 as SpeciesId,
      slot: { kind: "starter", index: 2 },
    });
    // Preview Venusaur (#3) across empty starter slots
    const previews = previewCandidateEdges(draft.lineup, 3 as SpeciesId);
    const rcbLink = previews.find(
      (e) =>
        (e.a === "4-3-3.LCB" && e.b === "4-3-3.RCB") ||
        (e.a === "4-3-3.RCB" && e.b === "4-3-3.LCB"),
    );
    expect(rcbLink).toEqual({
      a: "4-3-3.LCB",
      b: "4-3-3.RCB",
      reasons: ["sharedType", "evoLine", "sameGen", "coverage"],
      value: 1,
    });
  });
});
