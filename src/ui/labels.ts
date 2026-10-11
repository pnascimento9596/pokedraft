import type {
  CupFinish,
  CupRound,
  DraftOrder,
  DraftStyle,
  Gen,
  Mode,
  PokemonType,
  Region,
  Role,
} from "@/engine";

export const REGION_LABEL: Readonly<Record<Region, string>> = {
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
  unova: "Unova",
  kalos: "Kalos",
  alola: "Alola",
  galar: "Galar",
  paldea: "Paldea",
};

export const GEN_REGION: Readonly<Record<Gen, Region>> = {
  1: "kanto",
  2: "johto",
  3: "hoenn",
  4: "sinnoh",
  5: "unova",
  6: "kalos",
  7: "alola",
  8: "galar",
  9: "paldea",
};

export function genLabel(gen: Gen): string {
  return `Gen ${gen} ${REGION_LABEL[GEN_REGION[gen]]}`;
}

export function typeLabel(type: PokemonType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export const STYLE_LABEL: Readonly<Record<DraftStyle, string>> = {
  open: "Open",
  classic3: "Classic",
};

export const ORDER_LABEL: Readonly<Record<DraftOrder, string>> = {
  squadFirst: "Squad First",
  positionFirst: "Position First",
};

export const MODE_LABEL: Readonly<Record<Mode, string>> = {
  builder: "Friendly",
  cup8: "8-0 Challenge",
  kanto151: "151 Challenge",
};

export const FRIENDLY_LABEL = "Friendly (not ranked)";

export const ROUND_LABEL: Readonly<Record<CupRound, string>> = {
  G1: "Group match 1",
  G2: "Group match 2",
  G3: "Group match 3",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  F: "Final",
};

// How to Play and the results rules share this so they cannot drift apart again. It holds for
// every retained engine, because from the Round of 16 to the Final each round's nominal rating
// clears the round before by more than twice the ladder jitter.
export const LADDER_SHAPE =
  "The group games are the gentle start. From the Round of 32 on, every knockout round is a step up, and the Final is the hardest test.";

export const ROUND_SHORT: Readonly<Record<CupRound, string>> = {
  G1: "G1",
  G2: "G2",
  G3: "G3",
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  F: "Final",
};

export const FINISH_LABEL: Readonly<Record<CupFinish, string>> = {
  group: "Out in the group stage",
  R32: "Out in the Round of 32",
  R16: "Out in the Round of 16",
  QF: "Out in the quarter-final",
  SF: "Out in the semi-final",
  F: "Runner-up",
  champion: "Champions",
};

// Who a card's number is compared with: "vs other CBs". One short word where football has one,
// the role code otherwise, so the label also fits under a 60 px pitch token.
export const ROLE_PLURAL: Readonly<Record<Role, string>> = {
  GK: "keepers",
  CB: "CBs",
  FB: "FBs",
  WB: "WBs",
  DM: "DMs",
  CM: "CMs",
  AM: "AMs",
  WM: "WMs",
  W: "wingers",
  ST: "strikers",
};

export function versusLabel(role: Role): string {
  return `vs other ${ROLE_PLURAL[role]}`;
}

// The number on a card: where the player ranks for the role among all Pokémon, 0 to 100. It is
// the engine's quality (the quantity that picks the weak spots), rounded, never the raw fit.
export function qualityScore(quality: number): number {
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new RangeError(`quality must be a number in 0..1, got ${quality}`);
  }
  return Math.round(100 * quality);
}

export function tagLabel(tag: string): string {
  return tag.replace(/-/g, " ");
}

export function record(w: number, d: number, l: number): string {
  return `${w}-${d}-${l}`;
}
