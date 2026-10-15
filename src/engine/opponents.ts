import { TYPES, type PokemonType } from "@/data/pokedex";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { FORMATIONS } from "./formations";
import type { MatchStarter } from "./match";
import { canonicalSortBy, createEngineRng, deriveSubseed } from "./rng";
import { SPECIES, speciesById } from "./species";
import {
  CUP_ROUNDS,
  type CupRound,
  type LineStrength,
  type Mode,
  type Opponent,
  type OpponentPlayerRef,
  type Species,
} from "./types";

const OPEN_CLUBS = [
  "Viridian FC",
  "Cerulean City",
  "Vermilion Athletic",
  "Goldenrod United",
  "Ecruteak Town",
  "Olivine Rovers",
  "Mahogany FC",
  "Lilycove Athletic",
  "Slateport United",
  "Mauville City",
  "Fortree Rovers",
  "Hearthome City",
  "Jubilife FC",
  "Veilstone United",
  "Canalave Athletic",
  "Castelia City",
  "Nimbasa United",
  "Driftveil FC",
  "Opelucid Rovers",
  "Lumiose FC",
  "Santalune Town",
  "Shalour City",
  "Coumarine United",
  "Hau'oli City",
  "Konikoni Athletic",
  "Hammerlocke Rovers",
  "Motostoke United",
  "Wyndon FC",
  "Mesagoza FC",
  "Levincia City",
] as const;

const KANTO_CLUBS = [
  "Pallet Town",
  "Viridian FC",
  "Pewter United",
  "Cerulean City",
  "Vermilion FC",
  "Lavender Town",
  "Celadon City",
  "Fuchsia United",
  "Saffron City",
  "Cinnabar FC",
  "Indigo Plateau United",
] as const;

const CLUBS: Readonly<Record<Mode, readonly string[]>> = {
  builder: OPEN_CLUBS,
  cup8: OPEN_CLUBS,
  kanto151: KANTO_CLUBS,
};

const LINE_DRAW_ORDER = ["ATT", "DEF", "MID", "GK"] as const;
const SCORE_MAX = 1000;
const SCORE_PER_LINE = 10;
const KANTO151_MAX_ID = 151;
const ROSTER_SIZE = 11;
// Boss Clubs field a 4-3-3; roster fit shapes matchups around the ladder difficulty.
const BOSS_FORMATION = FORMATIONS["4-3-3"];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function bossPool(mode: Mode): readonly Species[] {
  return mode === "kanto151" ? SPECIES.filter((s) => s.id <= KANTO151_MAX_ID) : SPECIES;
}

const meanAttrs = (s: Species): number => {
  const values = Object.values(s.attrs) as readonly number[];
  return values.reduce((a, b) => a + b, 0) / values.length;
};

function themedPools(mode: Mode) {
  const pool = bossPool(mode);
  return TYPES.map((theme) => ({
    theme,
    members: canonicalSortBy(
      pool.filter((s) => (s.types as readonly PokemonType[]).includes(theme)),
      (s) => [-meanAttrs(s), s.id],
    ),
  })).filter(({ members }) => members.length >= ROSTER_SIZE);
}

const THEMED_POOLS = { kanto151: themedPools("kanto151"), open: themedPools("cup8") };

/**
 * A themed eleven for one rung: every member shares the drawn type, the window slides up the
 * themed pool's strength order as the rung rating rises, and each formation slot takes the
 * best remaining fit (the goalkeeper lands first).
 */
function bossRoster(
  mode: Mode,
  seed: string,
  rungIndex: number,
): readonly Extract<OpponentPlayerRef, { kind: "species" }>[] {
  const rng = createEngineRng(deriveSubseed(seed, "opponent_roster", `${rungIndex}`));
  const themed = rng.pick(THEMED_POOLS[mode === "kanto151" ? "kanto151" : "open"]).members;
  const lastRung = CUP_ROUNDS.length - 1;
  const start = Math.round(((themed.length - ROSTER_SIZE) * (lastRung - rungIndex)) / lastRung);
  const window = themed.slice(start, start + ROSTER_SIZE);
  const roster: Species[] = [];
  for (const slot of BOSS_FORMATION.slots) {
    const [best] = canonicalSortBy(
      window.filter((s) => !roster.includes(s)),
      (s) => [-s.fits[slot.role], s.id],
    );
    roster.push(best!);
  }
  return roster.map((s) => ({ kind: "species", id: s.id }));
}

/**
 * The Boss Club's roster as match starters: lineup order, the boss formation's line and role.
 * A retained opponent holds shirt refs, which the live engine never simulates, so it fails
 * honestly instead of guessing.
 */
export function bossStarters(opponent: Opponent): readonly MatchStarter[] {
  if (opponent.roster.length !== ROSTER_SIZE) {
    throw new RangeError(`opponent ${opponent.name} must field exactly ${ROSTER_SIZE} players`);
  }
  const seen = new Set<number>();
  return opponent.roster.map((ref, i) => {
    if (ref.kind !== "species") {
      throw new RangeError(`opponent ${opponent.name} has no Pokemon roster to field`);
    }
    if (seen.has(ref.id)) {
      throw new RangeError(`opponent ${opponent.name} fields duplicate Pokemon ${ref.id}`);
    }
    seen.add(ref.id);
    const slot = BOSS_FORMATION.slots[i]!;
    return { species: speciesById(ref.id), line: slot.line, role: slot.role };
  });
}

export function buildLadder(
  seed: string,
  mode: Mode,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): Record<CupRound, Opponent> {
  const rng = createEngineRng(deriveSubseed(seed, "opponent_selection"));
  const signed = (half: number): number => rng.int(2 * half + 1) - half;
  const pool = canonicalSortBy(CLUBS[mode], (name) => [name]);
  const names = rng.sample(pool, CUP_ROUNDS.length);
  const ladder = {} as Record<CupRound, Opponent>;
  CUP_ROUNDS.forEach((round, i) => {
    const score = Math.max(0, Math.min(SCORE_MAX, c.ladder.score[round] + signed(c.ladder.jitter)));
    const tilt = Object.fromEntries(LINE_DRAW_ORDER.map((l) => [l, signed(c.ladder.tilt)]));
    const lines: LineStrength = {
      GK: score / SCORE_PER_LINE + tilt.GK!,
      DEF: score / SCORE_PER_LINE + tilt.DEF!,
      MID: score / SCORE_PER_LINE + tilt.MID!,
      ATT: score / SCORE_PER_LINE + tilt.ATT!,
    };
    const name = names[i]!;
    const roster = bossRoster(mode, seed, i);
    const players = roster.map((ref) => speciesById(ref.id));
    const fit = Object.fromEntries(
      LINE_DRAW_ORDER.map((line) => {
        const members = BOSS_FORMATION.slots.flatMap((slot, index) =>
          slot.line === line ? [players[index]!.fits[slot.role]] : [],
        );
        return [line, members.reduce((sum, value) => sum + value, 0) / members.length];
      }),
    ) as Record<keyof LineStrength, number>;
    const centre =
      LINE_DRAW_ORDER.reduce((sum, line) => sum + fit[line], 0) / LINE_DRAW_ORDER.length;
    const scale = Math.max(1, ...LINE_DRAW_ORDER.map((line) => Math.abs(fit[line] - centre)));
    const shaped = Object.fromEntries(
      LINE_DRAW_ORDER.map((line) => [line, lines[line] + (3 * (fit[line] - centre)) / scale]),
    ) as unknown as LineStrength;
    const [captain] = canonicalSortBy(players, (s) => [-meanAttrs(s), s.id]);
    const theme = TYPES.find((type) =>
      players.every((s) => (s.types as readonly PokemonType[]).includes(type)),
    )!;
    const tacticalStyle =
      fit.ATT >= fit.MID && fit.ATT >= fit.DEF
        ? "direct"
        : fit.MID >= fit.DEF
          ? "possession"
          : "pressing";
    ladder[round] = {
      id: slug(name),
      name,
      score,
      lines: shaped,
      roster,
      formation: "4-3-3",
      captain: { kind: "species", id: captain!.id },
      theme,
      tacticalStyle,
    };
  });
  return ladder;
}
