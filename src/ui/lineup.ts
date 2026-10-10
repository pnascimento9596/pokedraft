import {
  DraftError,
  ENGINE_COEFFICIENTS,
  RUN_TOKEN_VERSION,
  RunTokenError,
  decodeToken,
  encodeToken,
  runDraft,
  type CupRound,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type Lineup,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "@/engine";

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

export function filledCount(lineup: Lineup): number {
  return [...lineup.starters, ...lineup.bench].filter((v) => v !== null).length;
}

// Builder state travels in the URL as a run token whose actions are one `place` per filled
// slot. The same format, with a real seed and all 16 slots, is the friendly-cup token.
export const BUILDER_URL_SEED = "builder" as Seed;

export function builderToken(settings: DraftSettings, lineup: Lineup, seed: Seed): string {
  const actions: DraftAction[] = ALL_REFS.flatMap((slot) => {
    const species = valueAt(lineup, slot);
    return species === null ? [] : [{ type: "place" as const, species, slot }];
  });
  return encodeToken({ v: RUN_TOKEN_VERSION, settings, seed, actions });
}

export function draftFromBuilderToken(token: string): DraftState | null {
  try {
    const run = decodeToken(token);
    if (run.settings.mode !== "builder") return null;
    return runDraft(run.settings, run.seed, run.actions);
  } catch (e) {
    if (e instanceof RunTokenError || e instanceof DraftError) return null;
    throw e;
  }
}

// The nominal ladder from the engine's coefficient table. A run's actual opponents carry a
// small seeded jitter around these numbers; the cup result reports the exact values.
export const NOMINAL_LADDER: Readonly<Record<CupRound, number>> = ENGINE_COEFFICIENTS.ladder.score;
