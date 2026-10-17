import type { Rng } from "@/lib/rng";
import type { Move, Moveset } from "@/data/movesets";
import type { PokemonType } from "@/engine/types";

/** The broadcast's on-pitch effect for a move. */
export const EFFECTS = [
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "psychic",
  "impact",
  "shield",
  "dive",
] as const;
export type Effect = (typeof EFFECTS)[number];

const TYPE_EFFECT: Partial<Record<PokemonType, Effect>> = {
  fire: "fire",
  water: "water",
  electric: "electric",
  grass: "grass",
  ice: "ice",
  psychic: "psychic",
};

export function effectFor(type: PokemonType): Effect {
  return TYPE_EFFECT[type] ?? "impact";
}

/** A move called on the pitch: who used it, the canon move, and the effect it draws. */
export interface Callout {
  readonly text: string;
  readonly move: string | null;
  readonly type: PokemonType | null;
  readonly effect: Effect;
}

/** A scorer's move: a damaging move with power when the species has one, else any of its moves. */
export function pickMove(moves: readonly Move[], rng: Rng): Move | null {
  const damaging = moves.filter((m) => m.damageClass !== "status" && m.power !== null);
  const pool = damaging.length > 0 ? damaging : moves;
  return pool.length === 0 ? null : rng.pick(pool);
}

export function shotCallout(name: string, moveset: Moveset | null, rng: Rng): Callout {
  const move = moveset === null ? null : pickMove(moveset.moves, rng);
  if (move === null) return { text: `${name} shoots!`, move: null, type: null, effect: "impact" };
  return {
    text: `${name} used ${move.name}!`,
    move: move.name,
    type: move.type,
    effect: effectFor(move.type),
  };
}

export function saveCallout(name: string, moveset: Moveset | null): Callout {
  const move = moveset?.keeperMove ?? null;
  if (move === null) return { text: `${name} dives!`, move: null, type: null, effect: "dive" };
  return { text: `${name} used ${move.name}!`, move: move.name, type: move.type, effect: "shield" };
}

export type PlayRole = "pass" | "dribble" | "duel";

const PLAY_FALLBACK: Readonly<Record<PlayRole, string>> = {
  pass: "threads a pass!",
  dribble: "surges forward!",
  duel: "wins the tackle!",
};

export function playCallout(
  name: string,
  moveset: Moveset | null,
  role: PlayRole,
  rng: Rng,
): Callout {
  const move = moveset === null ? null : pickMove(moveset.moves, rng);
  if (move === null) {
    return { text: `${name} ${PLAY_FALLBACK[role]}`, move: null, type: null, effect: "impact" };
  }
  return {
    text: `${name} used ${move.name}!`,
    move: move.name,
    type: move.type,
    effect: effectFor(move.type),
  };
}
