import { slotRefs } from "@/engine/draft";
import { FORMATIONS } from "@/engine/formations";
import type { EngineRng } from "@/engine/rng";
import { ROLE_LINE, SPECIES, speciesById } from "@/engine/species";
import {
  REROLLS,
  SPECIAL_CAP,
  type DraftAction,
  type DraftState,
  type Formation,
  type PokemonType,
  type RerollTarget,
  type Role,
  type SlotRef,
  type Species,
  type SpeciesId,
} from "@/engine/types";
import { GK_ATTRS, OUTFIELD_ATTRS, ROLES } from "@/scouting/types";

export const BOT_NAMES = ["random", "good", "oracle"] as const;
export type BotName = (typeof BOT_NAMES)[number];

export interface Bot {
  readonly name: BotName;
  decide(state: DraftState, rng: EngineRng): readonly DraftAction[];
  build(state: DraftState, rng: EngineRng): readonly DraftAction[];
}

export interface Valuer {
  readonly roleValue: (s: Species, role: Role) => number;
  readonly rerollBelow: number;
}

const BENCH_WEIGHT = 0.6;
const SAME_LINE_FACTOR = 0.9;
const OFF_LINE_FACTOR = 0.75;

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function visible(s: Species, role: Role): number {
  const attrs = role === "GK" ? GK_ATTRS : OUTFIELD_ATTRS;
  const base = mean(attrs.map((a) => s.attrs[a]));
  if (s.bestRoles.includes(role)) return base;
  const sameLine = s.bestRoles.some((r) => ROLE_LINE[r] === ROLE_LINE[role]);
  return base * (sameLine ? SAME_LINE_FACTOR : OFF_LINE_FACTOR);
}

const VISIBLE = new Map<SpeciesId, Readonly<Record<Role, number>>>(
  SPECIES.map((s) => [
    s.id,
    Object.fromEntries(ROLES.map((r) => [r, visible(s, r)])) as Record<Role, number>,
  ]),
);

export const GOOD: Valuer = {
  roleValue: (s, role) => VISIBLE.get(s.id)![role],
  rerollBelow: 50,
};

export const ORACLE: Valuer = {
  roleValue: (s, role) => s.quality[role],
  rerollBelow: 0.7,
};

export function slotValue(v: Valuer, formation: Formation, s: Species, ref: SlotRef): number {
  if (ref.kind === "starter") return v.roleValue(s, formation.slots[ref.index]!.role);
  const roles = [...new Set(formation.slots.map((slot) => slot.role))];
  return BENCH_WEIGHT * Math.max(...roles.map((r) => v.roleValue(s, r)));
}

export function slotOf(state: DraftState, ref: SlotRef): SpeciesId | null {
  return ref.kind === "starter" ? state.lineup.starters[ref.index] : state.lineup.bench[ref.index];
}

export function emptySlots(state: DraftState): SlotRef[] {
  return slotRefs().filter((ref) => slotOf(state, ref) === null);
}

const COMBO = new Map<string, readonly Species[]>();
for (const s of SPECIES) {
  for (const t of s.types) {
    const key = `${s.region}:${t}`;
    COMBO.set(key, [...(COMBO.get(key) ?? []), s]);
  }
}

export function pickable(state: DraftState): readonly SpeciesId[] {
  if (state.phase.kind !== "choosing") throw new Error(`no pickable set in ${state.phase.kind}`);
  const roll = state.phase.roll;
  if (roll.kind === "species") return [roll.species];
  if (roll.offers !== null) return roll.offers;
  const taken = new Set<number>(state.drafted);
  const capped = state.drafted.filter((id) => speciesById(id).special).length >= SPECIAL_CAP;
  return (COMBO.get(`${roll.region}:${roll.type satisfies PokemonType}`) ?? [])
    .filter((s) => !taken.has(s.id) && (!capped || !s.special))
    .map((s) => s.id);
}

function rerollTargets(state: DraftState): readonly RerollTarget[] {
  const mode = state.settings.mode;
  if (mode === "builder") return [];
  if (state.rerollsUsed >= REROLLS[mode]) return [];
  return mode === "cup8" ? ["type", "region"] : ["species"];
}

function byId(ids: readonly SpeciesId[]): SpeciesId[] {
  return [...ids].sort((a, b) => a - b);
}

export function bestFor(
  v: Valuer,
  formation: Formation,
  candidates: readonly SpeciesId[],
  slots: readonly SlotRef[],
): { species: SpeciesId; slot: SlotRef; value: number } | null {
  let best: { species: SpeciesId; slot: SlotRef; value: number } | null = null;
  for (const id of byId(candidates)) {
    const s = speciesById(id);
    for (const slot of slots) {
      const value = slotValue(v, formation, s, slot);
      if (best === null || value > best.value) best = { species: id, slot, value };
    }
  }
  return best;
}

function greedyBot(name: BotName, v: Valuer): Bot {
  return {
    name,
    decide(state) {
      const formation = FORMATIONS[state.settings.formation];
      if (state.phase.kind === "awaitingSlot")
        return [{ type: "chooseSlot", slot: emptySlots(state)[0]! }];
      if (state.phase.kind !== "choosing") throw new Error(`cannot act in ${state.phase.kind}`);
      const committed = state.phase.slot;
      const best = bestFor(
        v,
        formation,
        pickable(state),
        committed === null ? emptySlots(state) : [committed],
      );
      if (best === null) throw new Error("nothing pickable");
      const pick: DraftAction = {
        type: "pick",
        species: best.species,
        slot: committed === null ? best.slot : null,
      };
      if (best.value >= v.rerollBelow) return [pick];
      return [
        ...rerollTargets(state).map((target): DraftAction => ({ type: "reroll", target })),
        pick,
      ];
    },
    build(state) {
      const formation = FORMATIONS[state.settings.formation];
      const remaining = new Set<SpeciesId>(eligibleIds(state));
      return slotRefs().map((slot): DraftAction => {
        const best = bestFor(v, formation, [...remaining], [slot]);
        if (best === null) throw new Error("builder pool ran out");
        remaining.delete(best.species);
        return { type: "place", species: best.species, slot };
      });
    },
  };
}

function eligibleIds(state: DraftState): SpeciesId[] {
  if (state.settings.mode !== "builder") throw new Error("eligibleIds is for builder");
  const { gens, legendaries } = state.settings;
  return SPECIES.filter((s) => gens.includes(s.gen) && (legendaries || !s.special)).map(
    (s) => s.id,
  );
}

const randomBot: Bot = {
  name: "random",
  decide(state, rng) {
    if (state.phase.kind === "awaitingSlot") {
      return [{ type: "chooseSlot", slot: rng.pick(emptySlots(state)) }];
    }
    if (state.phase.kind !== "choosing") throw new Error(`cannot act in ${state.phase.kind}`);
    const species = rng.pick(pickable(state));
    const slot = state.phase.slot === null ? rng.pick(emptySlots(state)) : null;
    return [{ type: "pick", species, slot }];
  },
  build(state, rng) {
    const chosen = rng.sample(eligibleIds(state), slotRefs().length);
    return slotRefs().map((slot, i): DraftAction => ({ type: "place", species: chosen[i]!, slot }));
  },
};

export const BOTS: Readonly<Record<BotName, Bot>> = {
  random: randomBot,
  good: greedyBot("good", GOOD),
  oracle: greedyBot("oracle", ORACLE),
};
