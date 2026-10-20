import type { EngineCoefficients } from "@/engine/coefficients";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { FORMATIONS } from "@/engine/formations";
import { penaltyEdge } from "@/engine/match";
import { canonicalSortBy, createEngineRng } from "@/engine/rng";
import { speciesById } from "@/engine/species";
import {
  DraftError,
  FORMATION_IDS,
  GENS,
  TACTICS,
  type CupResult,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type FormationId,
  type FullLineup,
  type GoalKind,
  type ManagerAction,
  type Opponent,
  type Seed,
  type Species,
  type SpeciesId,
  type Tactic,
} from "@/engine/types";
import { EDGE_MARGIN } from "@/ui/manager/intel";
import { BOTS, type BotName } from "./bots";
import {
  bootstrap,
  difference,
  mean,
  meanInterval,
  quartileCuts,
  quartileOf,
  wilson,
} from "./stats";

export const PROBE_MODES = [
  "manager",
  "informed",
  "noop",
  "oracle",
  "luck",
  "upsets",
  "formations",
  "shootouts",
  "kinds",
] as const;
export type ProbeMode = (typeof PROBE_MODES)[number];

export interface ProbeOptions {
  readonly n: number;
  readonly seeds: number;
  readonly bots: readonly BotName[];
  readonly formation: FormationId;
  readonly c: EngineCoefficients;
}

export const DEFAULT_BOTS: Readonly<Record<ProbeMode, readonly BotName[]>> = {
  manager: ["good", "random"],
  informed: ["good", "random"],
  noop: ["good", "random"],
  oracle: ["good", "random"],
  luck: ["random", "good", "oracle"],
  upsets: ["random", "good", "oracle"],
  formations: ["good"],
  shootouts: ["good"],
  kinds: ["good"],
};

const DRAFT_SEEDS =
  "draft seed probe-<formation>-<bot>-<i>, bot rng play:probe:<formation>:<bot>:<i>, i = 1..n";
const BOOTSTRAP_RESAMPLES = 1000;
const MAX_DRAFT_STEPS = 300;
const SHOOTOUT_TAKERS = 5;

type Outcome = "W" | "D" | "L";
const RANK: Readonly<Record<Outcome, number>> = { W: 2, D: 1, L: 0 };

function settings(formation: FormationId): DraftSettings {
  return { mode: "cup8", formation, gens: GENS, style: "classic3", order: "squadFirst" };
}

function firstApplicable(state: DraftState, candidates: readonly DraftAction[]): DraftState {
  for (const a of candidates) {
    try {
      return applyAction(state, a);
    } catch (e) {
      if (a.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives") continue;
      throw e;
    }
  }
  throw new Error("every candidate refused");
}

export function draftSquad(
  bot: BotName,
  formation: FormationId,
  i: number,
): { readonly seed: Seed; readonly lineup: FullLineup } {
  const seed = `probe-${formation}-${bot}-${i}` as Seed;
  const rng = createEngineRng(`play:probe:${formation}:${bot}:${i}`);
  let state = createDraft(settings(formation), seed);
  for (let step = 0; state.phase.kind !== "complete"; step++) {
    if (step >= MAX_DRAFT_STEPS) throw new Error("draft did not finish");
    state = firstApplicable(state, BOTS[bot].decide(state, rng));
  }
  return { seed, lineup: toFullLineup(state) };
}

function tacticRatio(
  c: EngineCoefficients,
  style: "pressing" | "possession" | "direct",
  t: Tactic,
) {
  const [own, gives] = c.manager.styleEdges[style][t] ?? c.manager.tactics[t];
  return own / gives;
}

/**
 * The informed manager's kickoff tactic: the best favourable tactic against the opponent's
 * style by the scout's own ranking (intel.ts), otherwise Balanced. It reads the coefficients
 * under test, because at the flip the scout reads the candidate table.
 */
export function informedTactic(style: Opponent["tacticalStyle"], c: EngineCoefficients): Tactic {
  if (style === undefined || style === "balanced") return "balanced";
  const [best] = [...TACTICS].sort((a, b) => tacticRatio(c, style, b) - tacticRatio(c, style, a));
  return tacticRatio(c, style, best!) >= 1 + EDGE_MARGIN ? best! : "balanced";
}

interface Tally {
  w: number;
  d: number;
  l: number;
}

function tally(): Tally {
  return { w: 0, d: 0, l: 0 };
}

function add(t: Tally, o: Outcome): void {
  if (o === "W") t.w++;
  else if (o === "D") t.d++;
  else t.l++;
}

function rates(t: Tally) {
  const n = t.w + t.d + t.l;
  return { n, win: wilson(t.w, n), draw: wilson(t.d, n), loss: wilson(t.l, n) };
}

/** Each played match of the auto-coached cup, replayed with one kickoff tactic. */
function replayWithTactic(
  lineup: FullLineup,
  seed: Seed,
  c: EngineCoefficients,
  match: number,
  tactic: Tactic,
): Outcome {
  const action: ManagerAction = { type: "tactic", match, minute: 0, tactic };
  const m = runCup(lineup, seed, "cup8", c, [action]).matches[match]!;
  if (m.status !== "played") throw new Error("match vanished");
  return m.outcome;
}

function versusAuto(arm: Tally, auto: Tally, armWins: number, autoWins: number, n: number) {
  const a = wilson(armWins, n);
  const b = wilson(autoWins, n);
  return { ...rates(arm), autoWin: b, winMinusAuto: difference(a, b) };
}

function managerFor(bot: BotName, o: ProbeOptions) {
  const keys = ["auto", ...TACTICS, "styleRule", "informed", "oracle"] as const;
  const by = Object.fromEntries(keys.map((k) => [k, tally()])) as Record<
    (typeof keys)[number],
    Tally
  >;
  const byStyle: Record<string, { n: number; wins: Record<string, number> }> = {};
  const discordant = {
    informed: { armOnly: 0, autoOnly: 0 },
    balanced: { armOnly: 0, autoOnly: 0 },
  };
  let matches = 0;
  let flips = 0;
  // The audit's hand-written rule, kept so the audit's numbers reproduce.
  const STYLE_RULE: Readonly<Record<string, Tactic>> = {
    pressing: "counter",
    possession: "press",
    direct: "balanced",
    balanced: "balanced",
  };
  for (let i = 1; i <= o.n; i++) {
    const { seed, lineup } = draftSquad(bot, o.formation, i);
    const auto = runCup(lineup, seed, "cup8", o.c);
    auto.matches.forEach((m, mi) => {
      if (m.status !== "played") return;
      matches++;
      add(by.auto, m.outcome);
      const style = m.opponent.tacticalStyle ?? "balanced";
      const s = (byStyle[style] ??= { n: 0, wins: {} });
      s.n++;
      const outs = {} as Record<Tactic, Outcome>;
      for (const t of TACTICS) {
        outs[t] = replayWithTactic(lineup, seed, o.c, mi, t);
        add(by[t], outs[t]);
        s.wins[t] = (s.wins[t] ?? 0) + (outs[t] === "W" ? 1 : 0);
      }
      s.wins.auto = (s.wins.auto ?? 0) + (m.outcome === "W" ? 1 : 0);
      add(by.styleRule, outs[STYLE_RULE[style]!]!);
      const informed = outs[informedTactic(m.opponent.tacticalStyle, o.c)];
      add(by.informed, informed);
      s.wins.informed = (s.wins.informed ?? 0) + (informed === "W" ? 1 : 0);
      for (const [arm, out] of [
        ["informed", informed],
        ["balanced", outs.balanced],
      ] as const) {
        if (out === "W" && m.outcome !== "W") discordant[arm].armOnly++;
        if (out !== "W" && m.outcome === "W") discordant[arm].autoOnly++;
      }
      const best = Object.values(outs).reduce(
        (a, b) => (RANK[b] > RANK[a] ? b : a),
        "L" as Outcome,
      );
      add(by.oracle, RANK[m.outcome] > RANK[best] ? m.outcome : best);
      if (new Set([...Object.values(outs), m.outcome]).size > 1) flips++;
    });
  }
  const table = Object.fromEntries(
    keys.map((k) => [k, versusAuto(by[k], by.auto, by[k].w, by.auto.w, matches)]),
  );
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    matches,
    flipShare: wilson(flips, matches),
    table,
    discordantWins: discordant,
    winByStyle: Object.fromEntries(
      Object.entries(byStyle).map(([style, s]) => [
        style,
        {
          n: s.n,
          informedTactic: informedTactic(style as Opponent["tacticalStyle"], o.c),
          ...Object.fromEntries(Object.entries(s.wins).map(([k, w]) => [k, wilson(w, s.n)])),
        },
      ]),
    ),
  };
}

function armFor(bot: BotName, o: ProbeOptions, pick: (m: CupResult["matches"][number]) => Tactic) {
  const auto = tally();
  const arm = tally();
  let armOnly = 0;
  let autoOnly = 0;
  let matches = 0;
  for (let i = 1; i <= o.n; i++) {
    const { seed, lineup } = draftSquad(bot, o.formation, i);
    const cup = runCup(lineup, seed, "cup8", o.c);
    cup.matches.forEach((m, mi) => {
      if (m.status !== "played") return;
      matches++;
      add(auto, m.outcome);
      const out = replayWithTactic(lineup, seed, o.c, mi, pick(m));
      add(arm, out);
      if (out === "W" && m.outcome !== "W") armOnly++;
      if (out !== "W" && m.outcome === "W") autoOnly++;
    });
  }
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    matches,
    auto: rates(auto),
    arm: rates(arm),
    winMinusAuto: difference(wilson(arm.w, matches), wilson(auto.w, matches)),
    discordantWins: { armOnly, autoOnly },
  };
}

function oracleFor(bot: BotName, o: ProbeOptions) {
  const auto = tally();
  const oracle = tally();
  let matches = 0;
  for (let i = 1; i <= o.n; i++) {
    const { seed, lineup } = draftSquad(bot, o.formation, i);
    const cup = runCup(lineup, seed, "cup8", o.c);
    cup.matches.forEach((m, mi) => {
      if (m.status !== "played") return;
      matches++;
      add(auto, m.outcome);
      let best: Outcome = m.outcome;
      for (const t of TACTICS) {
        const out = replayWithTactic(lineup, seed, o.c, mi, t);
        if (RANK[out] > RANK[best]) best = out;
      }
      add(oracle, best);
    });
  }
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    matches,
    auto: rates(auto),
    oracle: rates(oracle),
    winMinusAuto: difference(wilson(oracle.w, matches), wilson(auto.w, matches)),
  };
}

interface SquadWins {
  readonly wins: readonly number[];
}

function decompose(squads: readonly SquadWins[]) {
  const means = squads.map((s) => mean(s.wins));
  const within = mean(squads.map((s, k) => mean(s.wins.map((w) => (w - means[k]!) ** 2))));
  const grand = mean(squads.flatMap((s) => s.wins));
  const between = mean(means.map((m) => (m - grand) ** 2));
  return { grand, means, within, between, share: between / (between + within) };
}

function luckFor(bot: BotName, o: ProbeOptions) {
  const squads: SquadWins[] = [];
  let champs = 0;
  let groupExit = 0;
  for (let i = 1; i <= o.n; i++) {
    const { lineup } = draftSquad(bot, o.formation, i);
    const wins: number[] = [];
    for (let s = 0; s < o.seeds; s++) {
      const cup = runCup(lineup, `luck-${bot}-${i}-${s}` as Seed, "cup8", o.c);
      wins.push(cup.wins);
      if (cup.finish === "champion") champs++;
      if (cup.finish === "group") groupExit++;
    }
    squads.push({ wins });
  }
  const d = decompose(squads);
  const cups = o.n * o.seeds;
  const rng = (stat: string) => createEngineRng(`probe:bootstrap:luck:${bot}:${stat}`);
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    seedsPerSquad: o.seeds,
    cups,
    meanWins: bootstrap(squads, (x) => decompose(x).grand, rng("meanWins"), BOOTSTRAP_RESAMPLES),
    champion: wilson(champs, cups),
    groupExit: wilson(groupExit, cups),
    sdWithinSquad: Math.sqrt(d.within),
    sdBetweenSquads: Math.sqrt(d.between),
    squadShareOfVariance: bootstrap(
      squads,
      (x) => decompose(x).share,
      rng("share"),
      BOOTSTRAP_RESAMPLES,
    ),
    squadMeanRange: [Math.min(...d.means), Math.max(...d.means)],
  };
}

function upsetsFor(o: ProbeOptions) {
  const buckets = new Map<number, { n: number; w: number; d: number }>();
  let ko = 0;
  let et = 0;
  let so = 0;
  let soWin = 0;
  let coin = 0;
  for (const bot of o.bots) {
    for (let i = 1; i <= o.n; i++) {
      const { seed, lineup } = draftSquad(bot, o.formation, i);
      const cup = runCup(lineup, seed, "cup8", o.c);
      cup.matches.forEach((m, mi) => {
        if (m.status !== "played") return;
        const gap = Math.round((cup.rating.score - m.opponent.score) / 100) * 100;
        const b = buckets.get(gap) ?? { n: 0, w: 0, d: 0 };
        b.n++;
        if (m.outcome === "W") b.w++;
        if (m.outcome === "D") b.d++;
        buckets.set(gap, b);
        if (mi < 3) return;
        ko++;
        if (m.extraTime) et++;
        if (m.shootout) {
          so++;
          if (m.outcome === "W") soWin++;
          if (m.shootout.decider === "coin") coin++;
        }
      });
    }
  }
  return {
    bots: o.bots,
    formation: o.formation,
    squadsPerBot: o.n,
    curve: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([gap, b]) => ({ gap, n: b.n, win: wilson(b.w, b.n), draw: wilson(b.d, b.n) })),
    knockout: {
      matches: ko,
      extraTime: wilson(et, ko),
      shootout: wilson(so, ko),
      shootoutUserWin: wilson(soWin, so),
      coinDeciders: coin,
    },
  };
}

function formationsFor(bot: BotName, o: ProbeOptions) {
  return FORMATION_IDS.map((f) => {
    const wins: number[] = [];
    const scores: number[] = [];
    let champs = 0;
    for (let i = 1; i <= o.n; i++) {
      const { seed, lineup } = draftSquad(bot, f, i);
      const cup = runCup(lineup, seed, "cup8", o.c);
      wins.push(cup.wins);
      scores.push(cup.rating.score);
      if (cup.finish === "champion") champs++;
    }
    return {
      formation: f,
      bot,
      n: o.n,
      meanScore: meanInterval(scores),
      meanWins: meanInterval(wins),
      champion: wilson(champs, o.n),
    };
  });
}

function onFieldAtEnd(m: Extract<CupResult["matches"][number], { status: "played" }>): {
  readonly user: readonly Species[];
  readonly opp: readonly Species[];
} {
  if (m.windows === undefined || m.incidents === undefined)
    throw new Error("a live match always records windows and incidents");
  const last = m.windows[m.windows.length - 1]!;
  const sentOff = new Set<number>(
    m.incidents.flatMap((x) => (x.kind === "red" && x.side === "opp" ? [x.slot] : [])),
  );
  return {
    user: last.onPitch.flatMap((id) => (id === null ? [] : [speciesById(id)])),
    opp: m.opponent.roster.flatMap((ref, slot) =>
      ref.kind === "species" && !sentOff.has(slot) ? [speciesById(ref.id)] : [],
    ),
  };
}

function takerOrder(pitch: readonly Species[]): readonly Species[] {
  return canonicalSortBy(pitch, (s) => [-s.attrs.SHO, s.id]);
}

function meanEdge(takers: readonly Species[], keeper: Species): number {
  const first = Array.from({ length: SHOOTOUT_TAKERS }, (_, k) => takers[k % takers.length]!);
  return mean(first.map((t) => penaltyEdge(t, keeper)));
}

function shootoutsFor(bot: BotName, o: ProbeOptions) {
  const rows: { edge: number; won: boolean }[] = [];
  let cups = 0;
  let koMatches = 0;
  let coin = 0;
  for (let i = 1; i <= o.n; i++) {
    const { seed, lineup } = draftSquad(bot, o.formation, i);
    for (let s = 0; s < o.seeds; s++) {
      const cupSeed = (s === 0 ? seed : `${seed}:${s}`) as Seed;
      const cup = runCup(lineup, cupSeed, "cup8", o.c);
      cups++;
      cup.matches.forEach((m, mi) => {
        if (m.status !== "played" || mi < 3) return;
        koMatches++;
        if (m.shootout === null) return;
        const pitch = onFieldAtEnd(m);
        const userTakers = takerOrder(pitch.user);
        const oppTakers = takerOrder(pitch.opp);
        const userKeeper = speciesById(m.shootout.keeper);
        const oppGk = m.opponent.roster[0]!;
        if (oppGk.kind !== "species") throw new Error("opponent keeper is not a species");
        const oppKeeper = speciesById(oppGk.id);
        let u = 0;
        let p = 0;
        for (const k of m.shootout.kicks) {
          const expected =
            k.side === "user"
              ? userTakers[u++ % userTakers.length]!.id
              : oppTakers[p++ % oppTakers.length]!.id;
          const actual: SpeciesId =
            k.side === "user"
              ? (k.taker as SpeciesId)
              : (k.taker as { kind: "species"; id: SpeciesId }).id;
          if (actual !== expected) {
            throw new Error(`${cupSeed} match ${mi}: taker order reconstruction disagrees`);
          }
        }
        if (m.shootout.decider === "coin") coin++;
        rows.push({
          edge: meanEdge(userTakers, oppKeeper) - meanEdge(oppTakers, userKeeper),
          won: m.outcome === "W",
        });
      });
    }
  }
  const cuts = quartileCuts(rows.map((r) => r.edge));
  const quartiles = [0, 1, 2, 3].map((q) => {
    const inQ = rows.filter((r) => quartileOf(r.edge, cuts) === q);
    const edges = inQ.map((r) => r.edge);
    return {
      quartile: q + 1,
      n: inQ.length,
      edgeRange: [Math.min(...edges), Math.max(...edges)],
      meanEdge: mean(edges),
      userWin: wilson(inQ.filter((r) => r.won).length, inQ.length),
    };
  });
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    seedsPerSquad: o.seeds,
    cups,
    knockoutMatches: koMatches,
    shootouts: rows.length,
    shootoutRate: wilson(rows.length, koMatches),
    coinDeciders: coin,
    userWin: wilson(rows.filter((r) => r.won).length, rows.length),
    edgeCuts: cuts,
    quartiles,
    topMinusBottom: difference(quartiles[3]!.userWin, quartiles[0]!.userWin),
  };
}

const KINDS: readonly GoalKind[] = ["open-play", "header", "solo", "free-kick", "penalty"];

function kindsFor(bot: BotName, o: ProbeOptions) {
  const count = {
    user: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<GoalKind, number>,
    opp: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<GoalKind, number>,
  };
  const byAer: { aer: number; goals: number; headers: number }[] = [];
  let matches = 0;
  let penalties = 0;
  const missed = { saved: 0, missed: 0 };
  for (let i = 1; i <= o.n; i++) {
    const { seed, lineup } = draftSquad(bot, o.formation, i);
    const cup = runCup(lineup, seed, "cup8", o.c);
    const slots = FORMATIONS[lineup.formation].slots;
    for (const m of cup.matches) {
      if (m.status !== "played") continue;
      matches++;
      const xi = [...lineup.starters] as SpeciesId[];
      for (const a of m.absences) {
        const slot = slots.findIndex((s) => s.id === a.slot);
        if (a.in !== null) xi[slot] = a.in;
      }
      const attackers = slots.flatMap((s, k) => (s.line === "ATT" ? [speciesById(xi[k]!)] : []));
      let goals = 0;
      let headers = 0;
      for (const g of m.goals) {
        if (g.kind === undefined) throw new Error("a live goal always records its kind");
        count[g.side][g.kind]++;
        if (g.penalty) penalties++;
        if (g.side !== "user") continue;
        goals++;
        if (g.kind === "header") headers++;
      }
      byAer.push({ aer: mean(attackers.map((s) => s.attrs.AER)), goals, headers });
      for (const x of m.incidents ?? []) if (x.kind === "penalty") missed[x.outcome]++;
    }
  }
  const shares = (side: "user" | "opp") => {
    const total = KINDS.reduce((a, k) => a + count[side][k], 0);
    return {
      goals: total,
      share: Object.fromEntries(KINDS.map((k) => [k, wilson(count[side][k], total)])),
    };
  };
  const cuts = quartileCuts(byAer.map((r) => r.aer));
  return {
    bot,
    formation: o.formation,
    squads: o.n,
    matches,
    user: shares("user"),
    opp: shares("opp"),
    penalty: {
      goals: penalties,
      perMatch: penalties / matches,
      awardedObservable: penalties + missed.saved + missed.missed,
      awardedPerMatch: (penalties + missed.saved + missed.missed) / matches,
      saved: missed.saved,
      missed: missed.missed,
      conversion: wilson(penalties, penalties + missed.saved + missed.missed),
      note: "Awarded is scored penalties plus engine 7's saved and missed penalty incidents. Engine 6 has no missed penalty: a penalty is a goal relabelled, so its conversion is 1 by construction.",
    },
    headerShareByAttackerAer: {
      unit: "user side per played match; mean AER of the ATT-line starters after absences",
      cuts,
      quartiles: [0, 1, 2, 3].map((q) => {
        const inQ = byAer.filter((r) => quartileOf(r.aer, cuts) === q);
        return {
          quartile: q + 1,
          matches: inQ.length,
          meanAer: mean(inQ.map((r) => r.aer)),
          headerShare: wilson(
            inQ.reduce((a, r) => a + r.headers, 0),
            inQ.reduce((a, r) => a + r.goals, 0),
          ),
        };
      }),
    },
  };
}

const SEEDS: Readonly<Record<ProbeMode, string>> = {
  manager: `${DRAFT_SEEDS}; each played match of the auto cup replayed with every fixed kickoff tactic`,
  informed: `${DRAFT_SEEDS}; each played match of the auto cup replayed with the informed kickoff tactic`,
  noop: `${DRAFT_SEEDS}; each played match of the auto cup replayed with Balanced at kickoff`,
  oracle: `${DRAFT_SEEDS}; each played match of the auto cup replayed with every fixed kickoff tactic`,
  luck: `${DRAFT_SEEDS}; cup seeds luck-<bot>-<i>-<s>, s = 0..seeds-1`,
  upsets: DRAFT_SEEDS,
  formations: DRAFT_SEEDS,
  shootouts: `${DRAFT_SEEDS}; cup seed probe-<formation>-<bot>-<i> for s = 0, then probe-<formation>-<bot>-<i>:<s>`,
  kinds: DRAFT_SEEDS,
};

export function runProbe(mode: ProbeMode, o: ProbeOptions) {
  const perBot = <T>(f: (bot: BotName) => T) => o.bots.map(f);
  const results = (() => {
    switch (mode) {
      case "manager":
        return perBot((b) => managerFor(b, o));
      case "informed":
        return perBot((b) => armFor(b, o, (m) => informedTactic(m.opponent.tacticalStyle, o.c)));
      case "noop":
        return perBot((b) => armFor(b, o, () => "balanced"));
      case "oracle":
        return perBot((b) => oracleFor(b, o));
      case "luck":
        return perBot((b) => luckFor(b, o));
      case "upsets":
        return [upsetsFor(o)];
      case "formations":
        return perBot((b) => formationsFor(b, o));
      case "shootouts":
        return perBot((b) => shootoutsFor(b, o));
      case "kinds":
        return perBot((b) => kindsFor(b, o));
    }
  })();
  return {
    mode,
    n: o.n,
    seeds: o.seeds,
    bots: o.bots,
    formation: o.formation,
    seedScheme: SEEDS[mode],
    results,
  };
}

export type ProbeReport = ReturnType<typeof runProbe>;
