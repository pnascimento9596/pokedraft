import type { Rng } from "@/lib/rng";
import type { Move, Moveset } from "@/data/movesets";
import type { PokemonType } from "@/engine/types";

/**
 * The broadcast's on-pitch effect for a move: its type's own family, or a generic impact, shield or
 * dive when no typed move is known.
 */
export type Effect = PokemonType | "impact" | "shield" | "dive";

export function effectFor(type: PokemonType): Effect {
  return type;
}

/** A move called on the pitch: who used it, the canon move, and the effect it draws. */
export interface Callout {
  readonly text: string;
  readonly move: string | null;
  readonly type: PokemonType | null;
  readonly effect: Effect;
}

/**
 * A scorer's move: a damaging move with power when the species has one, else any of its moves.
 * Always draws exactly one number, so a stream shared with other picks stays aligned whether or
 * not the species has moves.
 */
export function pickMove(moves: readonly Move[], rng: Rng): Move | null {
  const roll = rng.next();
  const damaging = moves.filter((m) => m.damageClass !== "status" && m.power !== null);
  const pool = damaging.length > 0 ? damaging : moves;
  return pool.length === 0 ? null : pool[Math.floor(roll * pool.length)]!;
}

export function shotCallout(name: string, moveset: Moveset | null, rng: Rng): Callout {
  const move = pickMove(moveset?.moves ?? [], rng);
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
  const move = pickMove(moveset?.moves ?? [], rng);
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
