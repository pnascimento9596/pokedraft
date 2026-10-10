import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { canonicalSortBy, createEngineRng, deriveSubseed } from "./rng";
import { CUP_ROUNDS, type CupRound, type LineStrength, type Mode, type Opponent } from "./types";

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

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
    ladder[round] = { id: slug(name), name, score, lines };
  });
  return ladder;
}
