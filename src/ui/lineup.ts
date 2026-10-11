import type { FormationId, Lineup, Seed, SlotRef, SpeciesId } from "@/engine/types";
import { FORMATIONS } from "@/engine/formations";

export const STARTER_REFS: readonly SlotRef[] = Array.from({ length: 11 }, (_, i): SlotRef => ({
  kind: "starter",
  index: i as Extract<SlotRef, { kind: "starter" }>["index"],
}));
export const BENCH_REFS: readonly SlotRef[] = Array.from({ length: 5 }, (_, i): SlotRef => ({
  kind: "bench",
  index: i as Extract<SlotRef, { kind: "bench" }>["index"],
}));
export const ALL_REFS: readonly SlotRef[] = [...STARTER_REFS, ...BENCH_REFS];

export type RefKey = `s${number}` | `b${number}`;

export function refKey(ref: SlotRef): RefKey {
  return ref.kind === "starter" ? `s${ref.index}` : `b${ref.index}`;
}

export function refFromKey(key: string): SlotRef | null {
  return ALL_REFS.find((r) => refKey(r) === key) ?? null;
}

export function sameRef(a: SlotRef | null, b: SlotRef | null): boolean {
  return a !== null && b !== null && a.kind === b.kind && a.index === b.index;
}

export function valueAt(lineup: Lineup, ref: SlotRef): SpeciesId | null {
  return ref.kind === "starter" ? lineup.starters[ref.index] : lineup.bench[ref.index];
}

/** The label a slot shows on the pitch: the formation's position, or SUB 1 to SUB 5. */
export function slotLabel(lineup: Lineup, ref: SlotRef): string {
  return ref.kind === "starter"
    ? FORMATIONS[lineup.formation].slots[ref.index].label
    : `SUB ${ref.index + 1}`;
}

export function filledCount(lineup: Lineup): number {
  return [...lineup.starters, ...lineup.bench].filter((v) => v !== null).length;
}

// Builder state travels in the URL as a run token whose actions are one `place` per filled
// slot. The same format, with a real seed and all 16 slots, is the friendly-cup token.
export const BUILDER_URL_SEED = "builder" as Seed;

export function emptyLineup(formation: FormationId): Lineup {
  return {
    formation,
    starters: STARTER_REFS.map(() => null) as unknown as Lineup["starters"],
    bench: BENCH_REFS.map(() => null) as unknown as Lineup["bench"],
  };
}

