import { TYPES } from "@/data/pokedex";
import { createEngineRng, deriveSubseed, type EngineRng } from "./rng";
import { SPECIES } from "./species";
import {
  DRAFT_ROUNDS,
  DraftError,
  FORMATION_IDS,
  GENS,
  REGIONS,
  REROLLS,
  SPECIAL_CAP,
  type BenchIndex,
  type DraftAction,
  type DraftPhase,
  type DraftSettings,
  type DraftState,
  type FullLineup,
  type Gen,
  type Lineup,
  type PokemonType,
  type Region,
  type RerollTarget,
  type Roll,
  type Seed,
  type SlotRef,
  type Species,
  type SpeciesId,
  type StarterIndex,
} from "./types";

export type RolledSettings = Exclude<DraftSettings, { readonly mode: "builder" }>;
type ComboRoll = Extract<Roll, { readonly kind: "combo" }>;
type SpeciesRoll = Extract<Roll, { readonly kind: "species" }>;
type Eligible = (s: Species) => boolean;

const KANTO151_MAX_ID = 151;

const STARTER_INDICES: readonly StarterIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BENCH_INDICES: readonly BenchIndex[] = [0, 1, 2, 3, 4];
const SLOT_REFS: readonly SlotRef[] = [
  ...STARTER_INDICES.map((index): SlotRef => ({ kind: "starter", index })),
  ...BENCH_INDICES.map((index): SlotRef => ({ kind: "bench", index })),
];

export function slotRefs(): readonly SlotRef[] {
  return SLOT_REFS;
}

const BY_ID = new Map<number, Species>(SPECIES.map((s) => [s.id, s]));

function tableOf<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  const table = {} as Record<K, V>;
  for (const key of keys) table[key] = value(key);
  return table;
}

const REGION_SPECIES: Readonly<Record<Region, readonly Species[]>> = tableOf(REGIONS, (region) =>
  SPECIES.filter((s) => s.region === region),
);

const COMBO_SPECIES: Readonly<Record<Region, Readonly<Record<PokemonType, readonly Species[]>>>> =
  tableOf(REGIONS, (region) =>
    tableOf(TYPES, (type) =>
      REGION_SPECIES[region].filter((s) => (s.types as readonly PokemonType[]).includes(type)),
    ),
  );

const KANTO151_SPECIES: readonly Species[] = SPECIES.filter((s) => s.id <= KANTO151_MAX_ID);

function invalidSettings(message: string): never {
  throw new DraftError("invalidSettings", message);
}

function normalizeGens(gens: unknown): readonly Gen[] {
  if (!Array.isArray(gens) || gens.length === 0) invalidSettings("gens must be a non-empty list");
  const known: readonly number[] = GENS;
  const out: Gen[] = [];
  for (const g of gens) {
    if (typeof g !== "number" || !known.includes(g)) invalidSettings(`unknown gen ${String(g)}`);
    if (out.includes(g as Gen)) invalidSettings(`duplicate gen ${g}`);
    out.push(g as Gen);
  }
  return out.sort((a, b) => a - b);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    invalidSettings(`unknown ${what} ${String(value)}`);
  }
  return value as T;
}

export function normalizeSettings(settings: DraftSettings): DraftSettings {
  const formation = oneOf(settings.formation, FORMATION_IDS, "formation");
  switch (settings.mode) {
    case "builder":
      if (typeof settings.legendaries !== "boolean") invalidSettings("legendaries must be boolean");
      return {
        mode: "builder",
        formation,
        gens: normalizeGens(settings.gens),
        legendaries: settings.legendaries,
      };
    case "cup8":
      return {
        mode: "cup8",
        formation,
        gens: normalizeGens(settings.gens),
        style: oneOf(settings.style, ["open", "classic3"], "style"),
        order: oneOf(settings.order, ["squadFirst", "positionFirst"], "order"),
      };
    case "kanto151":
      return {
        mode: "kanto151",
        formation,
        order: oneOf(settings.order, ["squadFirst", "positionFirst"], "order"),
      };
    default:
      return invalidSettings(`unknown mode ${String((settings as { mode: unknown }).mode)}`);
  }
}

function inPool(settings: DraftSettings, s: Species): boolean {
  return settings.mode === "kanto151" ? s.id <= KANTO151_MAX_ID : settings.gens.includes(s.gen);
}

function eligibility(settings: DraftSettings, squad: readonly SpeciesId[]): Eligible {
  const taken = new Set<number>(squad);
  const specialsAllowed =
    settings.mode === "builder"
      ? settings.legendaries
      : squad.filter((id) => BY_ID.get(id)?.special === true).length < SPECIAL_CAP;
  return (s) => !taken.has(s.id) && inPool(settings, s) && (specialsAllowed || !s.special);
}

function draw<T>(rng: EngineRng, pool: readonly T[]): T {
  if (pool.length === 0) throw new DraftError("noAlternatives", "nothing left to roll");
  return rng.pick(pool);
}

function rollCombo(
  rng: EngineRng,
  settings: Extract<RolledSettings, { mode: "cup8" }>,
  eligible: Eligible,
  keep: { readonly region: Region; readonly excludeType: PokemonType } | null,
  excludeRegion: Region | null,
): ComboRoll {
  const region =
    keep?.region ??
    draw(
      rng,
      REGIONS.filter((r) => r !== excludeRegion && REGION_SPECIES[r].some(eligible)),
    );
  const type = draw(
    rng,
    TYPES.filter((t) => t !== keep?.excludeType && COMBO_SPECIES[region][t].some(eligible)),
  );
  const members = COMBO_SPECIES[region][type].filter(eligible).map((s) => s.id);
  const offers =
    settings.style === "classic3" ? rng.sample(members, Math.min(3, members.length)) : null;
  return { kind: "combo", region, type, offers };
}

function rollSpecies(rng: EngineRng, eligible: Eligible, exclude: SpeciesId | null): SpeciesRoll {
  const pool = KANTO151_SPECIES.filter((s) => s.id !== exclude && eligible(s));
  return { kind: "species", species: draw(rng, pool).id };
}

export interface RollInput {
  readonly settings: RolledSettings;
  readonly seed: Seed;
  readonly round: number;
  readonly rerollsInRound: number;
  readonly drafted: readonly SpeciesId[];
  readonly reroll: { readonly target: RerollTarget; readonly previous: Roll } | null;
}

export function rollFor(input: RollInput): Roll {
  const { settings, seed, round, rerollsInRound, drafted, reroll } = input;
  const rng = createEngineRng(
    deriveSubseed(seed, "draft_roll", `round:${round}:reroll:${rerollsInRound}`),
  );
  const eligible = eligibility(settings, drafted);
  if (settings.mode === "kanto151") {
    if (reroll === null) return rollSpecies(rng, eligible, null);
    if (reroll.target !== "species" || reroll.previous.kind !== "species") {
      throw new DraftError("invalidTarget", `kanto151 cannot reroll ${reroll.target}`);
    }
    return rollSpecies(rng, eligible, reroll.previous.species);
  }
  if (reroll === null) return rollCombo(rng, settings, eligible, null, null);
  if (reroll.target === "species" || reroll.previous.kind !== "combo") {
    throw new DraftError("invalidTarget", `cup8 cannot reroll ${reroll.target}`);
  }
  return reroll.target === "type"
    ? rollCombo(
        rng,
        settings,
        eligible,
        { region: reroll.previous.region, excludeType: reroll.previous.type },
        null,
      )
    : rollCombo(rng, settings, eligible, null, reroll.previous.region);
}

const EMPTY_LINEUP_SLOTS = {
  starters: [null, null, null, null, null, null, null, null, null, null, null],
  bench: [null, null, null, null, null],
} as const;

function freshRoll(
  settings: RolledSettings,
  seed: Seed,
  round: number,
  drafted: readonly SpeciesId[],
) {
  return rollFor({ settings, seed, round, rerollsInRound: 0, drafted, reroll: null });
}

function roundPhase(
  settings: RolledSettings,
  seed: Seed,
  round: number,
  drafted: readonly SpeciesId[],
): DraftPhase {
  if (round >= DRAFT_ROUNDS) return { kind: "complete" };
  if (settings.order === "positionFirst") return { kind: "awaitingSlot" };
  return { kind: "choosing", roll: freshRoll(settings, seed, round, drafted), slot: null };
}

export function createDraft(settings: DraftSettings, seed: Seed): DraftState {
  const normalized = normalizeSettings(settings);
  const lineup: Lineup = { formation: normalized.formation, ...EMPTY_LINEUP_SLOTS };
  const base = { settings: normalized, seed, round: 0, rerollsInRound: 0, rerollsUsed: 0, lineup };
  if (normalized.mode === "builder") {
    return { ...base, drafted: [], phase: { kind: "building" } };
  }
  return { ...base, drafted: [], phase: roundPhase(normalized, seed, 0, []) };
}

function sameSlot(a: SlotRef, b: SlotRef): boolean {
  return a.kind === b.kind && a.index === b.index;
}

function slotValue(lineup: Lineup, ref: SlotRef): SpeciesId | null {
  return ref.kind === "starter" ? lineup.starters[ref.index] : lineup.bench[ref.index];
}

function withSlot(lineup: Lineup, ref: SlotRef, value: SpeciesId | null): Lineup {
  if (ref.kind === "starter") {
    const starters = lineup.starters.map((v, i) => (i === ref.index ? value : v));
    return { ...lineup, starters: starters as unknown as Lineup["starters"] };
  }
  const bench = lineup.bench.map((v, i) => (i === ref.index ? value : v));
  return { ...lineup, bench: bench as unknown as Lineup["bench"] };
}

function swapSlots(lineup: Lineup, a: SlotRef, b: SlotRef): Lineup {
  const va = slotValue(lineup, a);
  const vb = slotValue(lineup, b);
  return withSlot(withSlot(lineup, a, vb), b, va);
}

function lineupSpecies(lineup: Lineup): SpeciesId[] {
  return [...lineup.starters, ...lineup.bench].filter((id): id is SpeciesId => id !== null);
}

function requireRolled(state: DraftState, action: DraftAction): RolledSettings {
  if (state.settings.mode === "builder") {
    throw new DraftError("wrongMode", `${action.type} is not available in builder`);
  }
  return state.settings;
}

function requireBuilder(state: DraftState, action: DraftAction): void {
  if (state.settings.mode !== "builder") {
    throw new DraftError("wrongMode", `${action.type} is only available in builder`);
  }
}

function choosing(state: DraftState): Extract<DraftPhase, { kind: "choosing" }> {
  if (state.phase.kind !== "choosing") {
    throw new DraftError("wrongPhase", `expected choosing, phase is ${state.phase.kind}`);
  }
  return state.phase;
}

function chooseSlot(
  state: DraftState,
  action: Extract<DraftAction, { type: "chooseSlot" }>,
): DraftState {
  const settings = requireRolled(state, action);
  if (settings.order !== "positionFirst") {
    throw new DraftError("wrongMode", "chooseSlot is only available in positionFirst order");
  }
  if (state.phase.kind !== "awaitingSlot") {
    throw new DraftError("wrongPhase", `expected awaitingSlot, phase is ${state.phase.kind}`);
  }
  if (slotValue(state.lineup, action.slot) !== null) {
    throw new DraftError("slotOccupied", "that slot is already filled");
  }
  const roll = freshRoll(settings, state.seed, state.round, state.drafted);
  return { ...state, phase: { kind: "choosing", roll, slot: action.slot } };
}

function assertPickable(state: DraftState, roll: Roll, id: SpeciesId): void {
  if (state.drafted.includes(id))
    throw new DraftError("alreadyDrafted", `${id} is already drafted`);
  const species = BY_ID.get(id);
  if (species === undefined) throw new DraftError("ineligible", `unknown species ${id}`);
  if (roll.kind === "species") {
    if (roll.species !== id) throw new DraftError("notOffered", `${id} was not rolled`);
  } else if (roll.offers !== null) {
    if (!roll.offers.includes(id)) throw new DraftError("notOffered", `${id} was not offered`);
  } else if (
    species.region !== roll.region ||
    !(species.types as readonly PokemonType[]).includes(roll.type)
  ) {
    throw new DraftError("notOffered", `${id} is not in ${roll.region} ${roll.type}`);
  }
  if (!eligibility(state.settings, state.drafted)(species)) {
    throw new DraftError("ineligible", `${id} is not eligible`);
  }
}

function pick(state: DraftState, action: Extract<DraftAction, { type: "pick" }>): DraftState {
  const settings = requireRolled(state, action);
  const phase = choosing(state);
  assertPickable(state, phase.roll, action.species);
  let target: SlotRef;
  if (phase.slot !== null) {
    if (action.slot !== null && !sameSlot(action.slot, phase.slot)) {
      throw new DraftError("slotMismatch", "pick must go into the committed slot");
    }
    target = phase.slot;
  } else {
    if (action.slot === null) throw new DraftError("slotRequired", "pick needs a slot");
    if (slotValue(state.lineup, action.slot) !== null) {
      throw new DraftError("slotOccupied", "that slot is already filled");
    }
    target = action.slot;
  }
  const drafted = [...state.drafted, action.species];
  const round = state.round + 1;
  return {
    ...state,
    round,
    rerollsInRound: 0,
    lineup: withSlot(state.lineup, target, action.species),
    drafted,
    phase: roundPhase(settings, state.seed, round, drafted),
  };
}

const REROLL_TARGETS: Readonly<Record<RolledSettings["mode"], readonly RerollTarget[]>> = {
  cup8: ["type", "region"],
  kanto151: ["species"],
};

function reroll(state: DraftState, action: Extract<DraftAction, { type: "reroll" }>): DraftState {
  const settings = requireRolled(state, action);
  const phase = choosing(state);
  if (!REROLL_TARGETS[settings.mode].includes(action.target)) {
    throw new DraftError("invalidTarget", `${settings.mode} cannot reroll ${action.target}`);
  }
  if (state.rerollsUsed >= REROLLS[settings.mode]) {
    throw new DraftError("noRerolls", "no rerolls left");
  }
  const rerollsInRound = state.rerollsInRound + 1;
  const roll = rollFor({
    settings,
    seed: state.seed,
    round: state.round,
    rerollsInRound,
    drafted: state.drafted,
    reroll: { target: action.target, previous: phase.roll },
  });
  return {
    ...state,
    rerollsInRound,
    rerollsUsed: state.rerollsUsed + 1,
    phase: { ...phase, roll },
  };
}

function place(state: DraftState, action: Extract<DraftAction, { type: "place" }>): DraftState {
  requireBuilder(state, action);
  const from = SLOT_REFS.find((ref) => slotValue(state.lineup, ref) === action.species);
  let lineup: Lineup;
  if (from !== undefined) {
    lineup = swapSlots(state.lineup, from, action.slot);
  } else {
    const species = BY_ID.get(action.species);
    if (species === undefined || !eligibility(state.settings, state.drafted)(species)) {
      throw new DraftError("ineligible", `${action.species} is not eligible`);
    }
    lineup = withSlot(state.lineup, action.slot, action.species);
  }
  return { ...state, lineup, drafted: lineupSpecies(lineup) };
}

function clear(state: DraftState, action: Extract<DraftAction, { type: "clear" }>): DraftState {
  requireBuilder(state, action);
  const lineup = withSlot(state.lineup, action.slot, null);
  return { ...state, lineup, drafted: lineupSpecies(lineup) };
}

function swap(state: DraftState, action: Extract<DraftAction, { type: "swap" }>): DraftState {
  const committed = state.phase.kind === "choosing" ? state.phase.slot : null;
  if (committed !== null && (sameSlot(action.a, committed) || sameSlot(action.b, committed))) {
    throw new DraftError("slotMismatch", "the committed slot cannot be swapped");
  }
  const lineup = swapSlots(state.lineup, action.a, action.b);
  const drafted = state.settings.mode === "builder" ? lineupSpecies(lineup) : state.drafted;
  return { ...state, lineup, drafted };
}

export function applyAction(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "chooseSlot":
      return chooseSlot(state, action);
    case "pick":
      return pick(state, action);
    case "reroll":
      return reroll(state, action);
    case "place":
      return place(state, action);
    case "clear":
      return clear(state, action);
    case "swap":
      return swap(state, action);
  }
}

export function runDraft(
  settings: DraftSettings,
  seed: Seed,
  actions: readonly DraftAction[],
): DraftState {
  return actions.reduce(applyAction, createDraft(settings, seed));
}

export function eligibleSpecies(state: DraftState): readonly SpeciesId[] {
  return SPECIES.filter(eligibility(state.settings, state.drafted)).map((s) => s.id);
}

export function isComplete(state: DraftState): boolean {
  if (state.phase.kind === "complete") return true;
  return (
    state.settings.mode === "builder" && lineupSpecies(state.lineup).length === SLOT_REFS.length
  );
}

export function toFullLineup(state: DraftState): FullLineup {
  const { formation, starters, bench } = state.lineup;
  const full = (id: SpeciesId | null): id is SpeciesId => id !== null;
  if (!starters.every(full) || !bench.every(full)) {
    throw new RangeError("the lineup still has empty slots");
  }
  return {
    formation,
    starters: starters as FullLineup["starters"],
    bench: bench as FullLineup["bench"],
  };
}
