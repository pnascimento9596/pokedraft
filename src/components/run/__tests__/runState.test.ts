import { describe, expect, it } from "vitest";
import type { DraftSettings, SlotRef } from "@/engine";
import { candidatesFor, startRun, step, type Run } from "../runState";

const SETTINGS: DraftSettings = { mode: "kanto151", formation: "4-3-3", order: "squadFirst" };

type StarterIndex = Extract<SlotRef, { kind: "starter" }>["index"];
const starter = (index: StarterIndex): SlotRef => ({ kind: "starter", index });

function pickInto(run: Run, index: StarterIndex): Run {
  const species = candidatesFor(run.state)[0]!;
  return step(run, { type: "pick", species, slot: starter(index) });
}

describe("run roll identity", () => {
  it("keeps the same rollId when two filled players are swapped mid-pick, so the wheel does not replay", () => {
    let run = startRun(SETTINGS, "swap-seed");
    run = pickInto(run, 0);
    run = pickInto(run, 1);
    const before = run.rollId;
    const rollBefore = run.state.phase.kind === "choosing" ? run.state.phase.roll : null;
    const swapped = step(run, { type: "swap", a: starter(0), b: starter(1) });
    expect(swapped.error).toBeNull();
    expect(swapped.rollId).toBe(before);
    expect(swapped.state.phase.kind === "choosing" ? swapped.state.phase.roll : null).toEqual(
      rollBefore,
    );
  });

  it("bumps rollId once per new round and once per reroll, never otherwise", () => {
    let run = startRun(SETTINGS, "bump-seed");
    expect(run.rollId).toBe(0);
    run = pickInto(run, 0);
    expect(run.rollId).toBe(1);
    const rerolled = step(run, { type: "reroll", target: "species" });
    expect(rerolled.error).toBeNull();
    expect(rerolled.rollId).toBe(2);
    expect(step(rerolled, { type: "swap", a: starter(0), b: starter(0) }).rollId).toBe(2);
  });
});
