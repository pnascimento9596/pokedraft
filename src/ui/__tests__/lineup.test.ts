import { describe, expect, it } from "vitest";
import { RUN_TOKEN_VERSION, applyAction, createDraft, type Seed, type SpeciesId } from "@/engine";
import { draftFromBuilderToken } from "../builder-token";
import { filledCount, slotLabel } from "../lineup";
import { swapMessage } from "../swap-message";

// A partial builder lineup (11 of 16 placed) shared as /?b=... under engine-1 (src/app/card/__tests__ at 90fa976).
const BUILDER_V1 =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiYnVpbGRlciIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXV1d";

describe("draftFromBuilderToken (catches old shared builder links opening an empty builder)", () => {
  it("reads a builder lineup shared under a retained engine version", () => {
    expect(RUN_TOKEN_VERSION).not.toBe(1);
    const draft = draftFromBuilderToken(BUILDER_V1);
    expect(draft === null ? null : [draft.settings.mode, filledCount(draft.lineup)]).toEqual([
      "builder",
      11,
    ]);
  });

  it("still rejects a version no engine issued", () => {
    expect(draftFromBuilderToken(BUILDER_V1.replace(/^pd1\./, "pd99."))).toBeNull();
  });
});

describe("swapMessage (what a tap or drag swap says to a screen reader)", () => {
  const fresh = createDraft(
    { mode: "builder", formation: "4-4-2", gens: [1], legendaries: false },
    "t" as Seed,
  );
  // Bulbasaur (#001) at GK, Pikachu (#025) on the second bench slot, the LF slot empty.
  const lineup = applyAction(
    applyAction(fresh, {
      type: "place",
      species: 1 as SpeciesId,
      slot: { kind: "starter", index: 0 },
    }),
    { type: "place", species: 25 as SpeciesId, slot: { kind: "bench", index: 1 } },
  ).lineup;

  it("names both moves for two players, and one move into an empty slot either way round", () => {
    expect([
      swapMessage(lineup, { kind: "starter", index: 0 }, { kind: "bench", index: 1 }),
      swapMessage(lineup, { kind: "starter", index: 0 }, { kind: "starter", index: 9 }),
      swapMessage(lineup, { kind: "starter", index: 9 }, { kind: "bench", index: 1 }),
      swapMessage(lineup, { kind: "starter", index: 9 }, { kind: "starter", index: 10 }),
    ]).toEqual([
      "Moved Bulbasaur to SUB 2 and Pikachu to GK.",
      "Moved Bulbasaur to LF.",
      "Moved Pikachu to LF.",
      "",
    ]);
  });

  it("labels slots as the pitch does", () => {
    expect([
      slotLabel(lineup, { kind: "starter", index: 2 }),
      slotLabel(lineup, { kind: "bench", index: 4 }),
    ]).toEqual(["LCB", "SUB 5"]);
  });
});
