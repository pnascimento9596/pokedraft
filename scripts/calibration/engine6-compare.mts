// Plays N seeded drafts with the calibration bots and runs each squad through the frozen engine 5
// and the live engine 6 with no coach decisions, so the auto coach, fatigue, injuries and cards
// can be compared with the engine they replace. Read-only: it changes nothing and retunes nothing.
//   pnpm exec tsx scripts/calibration/engine6-compare.mts [--n 2000] [--mode cup8|kanto151]
import { parseArgs } from "node:util";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { createEngineRng } from "@/engine/rng";
import {
  DraftError,
  GENS,
  type CupResult,
  type DraftAction,
  type DraftSettings,
  type Seed,
} from "@/engine/types";
import { runCup as runCupV5 } from "@/engine/versions/v5/src/engine/cup";
import { BOTS, type BotName } from "./bots";

const { values } = parseArgs({
  options: { n: { type: "string", default: "2000" }, mode: { type: "string", default: "cup8" } },
});
const N = Number(values.n);
const SETTINGS: DraftSettings =
  values.mode === "kanto151"
    ? { mode: "kanto151", formation: "4-3-3", order: "squadFirst" }
    : { mode: "cup8", formation: "4-3-3", gens: GENS, style: "classic3", order: "squadFirst" };

function firstApplicable(
  state: ReturnType<typeof createDraft>,
  candidates: readonly DraftAction[],
) {
  for (const action of candidates) {
    try {
      return applyAction(state, action);
    } catch (e) {
      if (action.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives")
        continue;
      throw e;
    }
  }
  throw new Error("every candidate action was refused");
}

interface Tally {
  runs: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  extraTime: number;
  shootouts: number;
  champions: number;
  groupExits: number;
  injuries: number;
  subs: number;
  yellows: number;
  reds: number;
  tactics: number;
}
const empty = (): Tally => ({
  runs: 0,
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  extraTime: 0,
  shootouts: 0,
  champions: 0,
  groupExits: 0,
  injuries: 0,
  subs: 0,
  yellows: 0,
  reds: 0,
  tactics: 0,
});

function add(t: Tally, cup: CupResult): void {
  t.runs++;
  t.wins += cup.wins;
  t.draws += cup.draws;
  t.losses += cup.losses;
  if (cup.finish === "champion") t.champions++;
  if (cup.finish === "group") t.groupExits++;
  for (const m of cup.matches) {
    if (m.status !== "played") continue;
    t.matches++;
    t.goalsFor += m.regulation.user + (m.extraTime?.user ?? 0);
    t.goalsAgainst += m.regulation.opp + (m.extraTime?.opp ?? 0);
    if (m.extraTime) t.extraTime++;
    if (m.shootout) t.shootouts++;
    for (const i of m.incidents ?? []) {
      if (i.kind === "injury") t.injuries++;
      if (i.kind === "sub") t.subs++;
      if (i.kind === "yellow") t.yellows++;
      if (i.kind === "red") t.reds++;
      if (i.kind === "tactic") t.tactics++;
    }
  }
}

const tallies = { v5: { good: empty(), random: empty() }, v6: { good: empty(), random: empty() } };
for (let i = 1; i <= N; i++) {
  const bot: BotName = i % 2 === 1 ? "good" : "random";
  const seed = `e6cmp-${values.mode}-${i}` as Seed;
  const rng = createEngineRng(`play:e6cmp:${i}`);
  let state = createDraft(SETTINGS, seed);
  for (let step = 0; state.phase.kind !== "complete"; step++) {
    if (step >= 200) throw new Error(`draft ${seed} did not finish`);
    state = firstApplicable(state, BOTS[bot].decide(state, rng));
  }
  const lineup = toFullLineup(state);
  add(tallies.v6[bot as "good" | "random"], runCup(lineup, seed, SETTINGS.mode));
  add(
    tallies.v5[bot as "good" | "random"],
    runCupV5(lineup as never, seed as never, SETTINGS.mode) as unknown as CupResult,
  );
}

const per = (x: number, d: number) => (d === 0 ? 0 : Math.round((x / d) * 1000) / 1000);
for (const engine of ["v5", "v6"] as const) {
  for (const bot of ["good", "random"] as const) {
    const t = tallies[engine][bot];
    console.log(
      JSON.stringify({
        engine,
        bot,
        runs: t.runs,
        winRate: per(t.wins, t.matches),
        drawRate: per(t.draws, t.matches),
        champions: per(t.champions, t.runs),
        groupExits: per(t.groupExits, t.runs),
        goalsForPerMatch: per(t.goalsFor, t.matches),
        goalsAgainstPerMatch: per(t.goalsAgainst, t.matches),
        extraTimeRate: per(t.extraTime, t.matches),
        shootoutRate: per(t.shootouts, t.matches),
        injuriesPerMatch: per(t.injuries, t.matches),
        subsPerMatch: per(t.subs, t.matches),
        yellowsPerMatch: per(t.yellows, t.matches),
        redsPerMatch: per(t.reds, t.matches),
        tacticChangesPerMatch: per(t.tactics, t.matches),
      }),
    );
  }
}
