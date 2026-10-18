import type { CSSProperties } from "react";
import type { PokemonType, Role } from "@/engine/types";

export const TYPE_PALETTE = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
} as const satisfies Readonly<Record<PokemonType, string>>;

/**
 * The opponent's ring when its club has no theme (`--bc-opp`), and the ring it switches to when
 * its kit is too close to the user's. White sits at least 12 from every type colour in every
 * vision the CVD audit checks.
 */
export const PITCH_KIT = { opp: "#60A5FA", clash: "#F8FAFC" } as const;

export const CARD_ROLE: Readonly<Record<Role, string>> = {
  GK: "GK",
  CB: "DF",
  FB: "DF",
  WB: "DF",
  DM: "MF",
  CM: "MF",
  AM: "MF",
  WM: "MF",
  W: "FW",
  ST: "FW",
};
export function typeFrame(type: PokemonType): CSSProperties {
  return { "--card-type": TYPE_PALETTE[type] } as CSSProperties;
}
export function pitchPoints(slots: readonly { readonly x: number; readonly y: number }[]) {
  const rows: number[] = [];
  for (const y of [...new Set(slots.map((slot) => slot.y))].sort((a, b) => a - b)) {
    if (rows.length === 0 || y - rows[rows.length - 1] > 7) rows.push(y);
  }
  return slots.map((slot) => {
    const row = rows.findLastIndex((y) => y <= slot.y);
    return { x: slot.x, y: 96 - (row * 92) / (rows.length - 1) - (slot.y - rows[row]) * 0.3 };
  });
}
