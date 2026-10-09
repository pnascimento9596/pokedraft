import { matchLineup } from "./availability";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { FORMATIONS } from "./formations";
import { simulateMatch, simulateScore, type MatchStarter, type Phase } from "./match";
import { buildLadder } from "./opponents";
import { canonicalSortBy, createEngineRng, deriveSubseed } from "./rng";
import { speciesById } from "./species";
import { awards, AWARD_POINTS, type PlayerTally } from "./stats";
import { benchQuality, matchLines, rateTeam } from "./team";
import {
  CUP_ROUNDS,
  ENGINE_VERSION,
  type CupFinish,
  type CupResult,
  type CupRound,
  type FullLineup,
  type GroupRow,
  type MatchResult,
  type Mode,
  type Opponent,
  type Seed,
  type SpeciesId,
} from "./types";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

interface Fixture {
  readonly a: string;
  readonly b: string;
  readonly aGoals: number;
  readonly bGoals: number;
}

const USER = "user";
const USER_NAME = "You";
const GROUP_ROUNDS = ["G1", "G2", "G3"] as const;
const OTHER_PAIRS = [
  ["G1", "G2"],
  ["G1", "G3"],
  ["G2", "G3"],
] as const;
const ADVANCE = 2;
const POINTS = { win: 3, draw: 1 } as const;

function pointsFor(own: number, other: number): number {
  if (own > other) return POINTS.win;
  return own === other ? POINTS.draw : 0;
}

function groupTable(
  seed: Seed,
  teams: readonly { id: string; name: string }[],
  fixtures: readonly Fixture[],
): GroupRow[] {
  const rows = teams.map(({ id, name }): GroupRow => {
    const sides = fixtures.flatMap((f) =>
      f.a === id ? [[f.aGoals, f.bGoals]] : f.b === id ? [[f.bGoals, f.aGoals]] : [],
    );
    const goalsFor = sides.reduce((s, [g]) => s + g!, 0);
    const goalsAgainst = sides.reduce((s, [, g]) => s + g!, 0);
    return {
      team: id,
      name,
      played: sides.length,
      won: sides.filter(([f, a]) => f! > a!).length,
      drawn: sides.filter(([f, a]) => f === a).length,
      lost: sides.filter(([f, a]) => f! < a!).length,
      goalsFor,
      goalsAgainst,
      points: sides.reduce((s, [f, a]) => s + pointsFor(f!, a!), 0),
    };
  });

  const lotsRng = createEngineRng(deriveSubseed(seed, "group_table"));
  const lots = canonicalSortBy(
    teams.map((t) => t.id),
    (id) => [id],
  );
  for (let i = lots.length - 1; i > 0; i--) {
    const j = lotsRng.int(i + 1);
    [lots[i], lots[j]] = [lots[j]!, lots[i]!];
  }

  const triple = (r: GroupRow): readonly number[] => [
    -r.points,
    -(r.goalsFor - r.goalsAgainst),
    -r.goalsFor,
  ];
  const sameTriple = (x: GroupRow, y: GroupRow): boolean =>
    triple(x).every((v, i) => v === triple(y)[i]);
  const headToHead = (r: GroupRow): number => {
    const tied = new Set(rows.filter((o) => sameTriple(o, r)).map((o) => o.team));
    return fixtures
      .filter((f) => tied.has(f.a) && tied.has(f.b))
      .reduce((s, f) => {
        if (f.a === r.team) return s + pointsFor(f.aGoals, f.bGoals);
        if (f.b === r.team) return s + pointsFor(f.bGoals, f.aGoals);
        return s;
      }, 0);
  };
  return canonicalSortBy(rows, (r) => [...triple(r), -headToHead(r), lots.indexOf(r.team)]);
}

export function runCup(
  lineup: FullLineup,
  seed: Seed,
  mode: Mode,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): CupResult {
  const formation = FORMATIONS[lineup.formation];
  const ladder = buildLadder(seed, mode, c);
  const rating = rateTeam(lineup, c);
  const roles = [...new Set(formation.slots.map((s) => s.role))];

  const tally = new Map<SpeciesId, PlayerTally>([
    ...lineup.starters.map((id, i): [SpeciesId, PlayerTally] => [
      id,
      {
        species: id,
        goals: 0,
        assists: 0,
        appearances: 0,
        cleanSheetPoints: 0,
        quality: speciesById(id).quality[formation.slots[i]!.role],
      },
    ]),
    ...lineup.bench.map((id): [SpeciesId, PlayerTally] => [
      id,
      {
        species: id,
        goals: 0,
        assists: 0,
        appearances: 0,
        cleanSheetPoints: 0,
        quality: benchQuality(speciesById(id), roles),
      },
    ]),
  ]);
  const bump = (id: SpeciesId, change: Partial<Record<keyof PlayerTally, number>>): void => {
    const t = tally.get(id)!;
    tally.set(id, {
      ...t,
      goals: t.goals + (change.goals ?? 0),
      assists: t.assists + (change.assists ?? 0),
      appearances: t.appearances + (change.appearances ?? 0),
      cleanSheetPoints: t.cleanSheetPoints + (change.cleanSheetPoints ?? 0),
    });
  };

  const play = (matchIndex: number, round: CupRound, opponent: Opponent): PlayedMatch => {
    const phase: Phase = matchIndex < GROUP_ROUNDS.length ? "group" : "knockout";
    const { lineup: fielded, absence } = matchLineup(lineup, seed, matchIndex, c);
    const matchRating = absence === null ? rating : rateTeam(fielded, c);
    const starters = fielded.starters.map((id, i): MatchStarter => ({
      species: speciesById(id),
      line: formation.slots[i]!.line,
    }));
    const match = simulateMatch(
      {
        matchIndex,
        round,
        phase,
        seed,
        rating: matchRating.score,
        userLines: matchLines(matchRating, c),
        starters,
        keeper: starters.find((s) => s.line === "GK")!.species,
        opponent,
        absences: absence === null ? [] : [absence],
      },
      c,
    );
    const conceded = match.regulation.opp + (match.extraTime?.opp ?? 0);
    for (const s of starters) {
      const sheet =
        conceded === 0 && (s.line === "GK" || s.line === "DEF")
          ? AWARD_POINTS.cleanSheet[s.line]
          : 0;
      bump(s.species.id, { appearances: 1, cleanSheetPoints: sheet });
    }
    for (const g of match.goals) {
      if (g.side !== "user") continue;
      bump(g.scorer, { goals: 1 });
      if (g.assist !== null) bump(g.assist, { assists: 1 });
    }
    return match;
  };

  const matches: MatchResult[] = GROUP_ROUNDS.map((round, i) => play(i, round, ladder[round]));
  const fixtures: Fixture[] = matches.map((m, i) => {
    const played = m as PlayedMatch;
    return {
      a: USER,
      b: ladder[GROUP_ROUNDS[i]!].id,
      aGoals: played.regulation.user,
      bGoals: played.regulation.opp,
    };
  });
  OTHER_PAIRS.forEach(([ra, rb], k) => {
    const [aGoals, bGoals] = simulateScore(
      ladder[ra].lines,
      ladder[rb].lines,
      seed,
      `group-other:${k}`,
      c,
    );
    fixtures.push({ a: ladder[ra].id, b: ladder[rb].id, aGoals, bGoals });
  });
  const group = groupTable(
    seed,
    [
      { id: USER, name: USER_NAME },
      ...GROUP_ROUNDS.map((r) => ({ id: ladder[r].id, name: ladder[r].name })),
    ],
    fixtures,
  );

  let finish: CupFinish = "champion";
  let alive = group.findIndex((r) => r.team === USER) < ADVANCE;
  if (!alive) finish = "group";
  CUP_ROUNDS.slice(GROUP_ROUNDS.length).forEach((round, k) => {
    if (!alive) {
      matches.push({ status: "notPlayed", round, opponent: null });
      return;
    }
    const match = play(GROUP_ROUNDS.length + k, round, ladder[round]);
    matches.push(match);
    if (match.outcome !== "W") {
      alive = false;
      finish = round as CupFinish;
    }
  });

  const played = matches.filter((m): m is PlayedMatch => m.status === "played");
  const wins = played.filter((m) => m.outcome === "W").length;
  const draws = played.filter((m) => m.outcome === "D").length;
  const losses = played.filter((m) => m.outcome === "L").length;
  const tallies = canonicalSortBy([...tally.values()], (t) => [t.species]);

  return {
    engine: ENGINE_VERSION,
    seed,
    mode,
    rating,
    group,
    matches,
    wins,
    draws,
    losses,
    finish,
    flawless: wins === CUP_ROUNDS.length && draws === 0 && losses === 0,
    players: tallies.map(({ species, goals, assists, appearances }) => ({
      species,
      goals,
      assists,
      appearances,
    })),
    awards: awards(tallies),
  };
}
