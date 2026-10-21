// The engine 7 pin summary (hand-off 6b8) from one calibration run directory:
//   pnpm exec tsx scripts/calibration/summarize-calibration.mts --dir <run dir> --head <sha>
// The directory holds the probe JSONs (informed, noop, oracle, shootouts, kinds, upsets,
// formations, luck), calibrate-5000.json, wincurve.stdout, achievements.txt and suite.log.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { wilson } from "./stats";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    out: { type: "string", default: "docs/reports/engine-7/calibration.json" },
    head: { type: "string" },
  },
});
if (args.dir === undefined) throw new RangeError("--dir is required");
const dir = args.dir;

interface Interval {
  value: number;
  lo: number;
  hi: number;
}
interface Proportion {
  count: number;
  n: number;
  p: number;
  lo: number;
  hi: number;
}
type Probe = { n: number; seedScheme: string; results: Record<string, unknown>[] };

const sources: Record<string, string> = {};
function text(name: string): string {
  const raw = readFileSync(`${dir}/${name}`, "utf8");
  sources[name] = createHash("sha256").update(raw).digest("hex");
  return raw;
}
const json = (name: string) => JSON.parse(text(name)) as Probe;
const byBot = (p: Probe) =>
  Object.fromEntries(p.results.map((r) => [r.bot as string, r])) as Record<
    string,
    Record<string, unknown>
  >;

// The v4 references the pins name: flawless Wilson intervals (engine-v4-calibration.md:62-66)
// and the win curve (engine-v4-calibration.md:72-94).
const V4_BUCKETS: Record<string, readonly [number, number]> = {
  "840±20": [0.0297, 0.0372],
  "900±20": [0.1147, 0.129],
  "950±20": [0.2946, 0.3072],
};
const V4_CURVE: Record<number, readonly [number, number, number]> = {
  [-300]: [0.004, 0.059, 0.023],
  [-250]: [0.006, 0.072, 0.031],
  [-200]: [0.007, 0.098, 0.043],
  [-150]: [0.047, 0.146, 0.103],
  [-100]: [0.106, 0.232, 0.214],
  [-50]: [0.211, 0.268, 0.347],
  0: [0.351, 0.299, 0.525],
  50: [0.509, 0.272, 0.698],
  100: [0.685, 0.207, 0.836],
  150: [0.816, 0.147, 0.928],
  200: [0.899, 0.093, 0.976],
  250: [0.92, 0.075, 0.979],
  300: [0.943, 0.053, 0.987],
  350: [0.951, 0.045, 0.988],
  400: [0.966, 0.032, 0.993],
  450: [0.971, 0.028, 0.995],
  500: [0.978, 0.02, 0.996],
};

const arm = (p: Probe) =>
  Object.fromEntries(
    Object.entries(byBot(p)).map(([bot, r]) => [
      bot,
      {
        matches: r.matches,
        auto: (r.auto as { win: Proportion }).win,
        arm: ((r.arm ?? r.oracle) as { win: Proportion }).win,
        winMinusAuto: r.winMinusAuto as Interval,
        discordantWins: r.discordantWins ?? null,
      },
    ]),
  );
const gain = (a: ReturnType<typeof arm>, bot: string) => a[bot]!.winMinusAuto.value;

const informed = arm(json("informed.json"));
const oracle = arm(json("oracle.json"));
const noop = arm(json("noop.json"));
const probeMeta = (name: string) => {
  const p = json(name);
  return { command: `probe.mts --probe ${name.replace(".json", "")}`, n: p.n, seeds: p.seedScheme };
};

const shootoutProbe = json("shootouts.json");
const so = shootoutProbe.results[0] as {
  shootouts: number;
  cups: number;
  knockoutMatches: number;
  shootoutRate: Proportion;
  userWin: Proportion;
  quartiles: { quartile: number; n: number; userWin: Proportion }[];
  topMinusBottom: Interval;
};
const q1 = so.quartiles[0]!.userWin;
const q4 = so.quartiles[3]!.userWin;

const calibrate = JSON.parse(text("calibrate-5000.json")) as {
  n: number;
  results: {
    row: string;
    bot: string;
    cupsRun: number;
    meanWins: number;
    meanWinsInterval?: Interval;
    flawless: Proportion;
  }[];
  buckets: { near: { label: string; count: number; flawless: Proportion }[] };
  goals: { total: number; byRole: Record<string, number>; attackingShare: number };
};
const row = (id: string, bot: string) => {
  const r = calibrate.results.find((x) => x.row === id && x.bot === bot)!;
  return { row: id, bot, cups: r.cupsRun, meanWins: r.meanWins, interval: r.meanWinsInterval };
};
const good = row("cup8-full", "good");
const careless = row("kanto151", "random");
const buckets = calibrate.buckets.near.map((b) => {
  const [lo, hi] = V4_BUCKETS[b.label]!;
  return { ...b, v4: [lo, hi], pass: b.flawless.p >= lo && b.flawless.p <= hi };
});
const attacking = calibrate.goals.total * calibrate.goals.attackingShare;

const curve = text("wincurve.stdout")
  .split("\n")
  .filter((l) => /^\| -?\d/.test(l))
  .map((l) => {
    const [gap, groupW, groupD, koW] = l
      .split("|")
      .slice(1, 5)
      .map((x) => Number(x.trim()));
    const v4 = V4_CURVE[gap!]!;
    const diffs = [groupW! - v4[0], groupD! - v4[1], koW! - v4[2]];
    return { gap, groupW, groupD, koW, v4, maxAbsDiff: Math.max(...diffs.map(Math.abs)) };
  });
const worstRow = curve.reduce((a, b) => (b.maxAbsDiff > a.maxAbsDiff ? b : a));

const kinds = json("kinds.json").results[0] as Record<string, unknown>;
const upsets = json("upsets.json").results[0] as Record<string, unknown>;
const luck = byBot(json("luck.json"));

const achievements = text("achievements.txt");
const earned = (id: string) => {
  const m = new RegExp(`^${id}: (\\d+) of (\\d+)`, "m").exec(achievements);
  if (m === null) throw new Error(`achievements.txt has no ${id} line`);
  return wilson(Number(m[1]), Number(m[2]));
};
const giantKiller = earned("giant-killer");

const walls = Object.fromEntries(
  text("suite.log")
    .split("\n")
    .flatMap((l) => {
      const m = /^(\S+) exit=(\d+) elapsed=(\d+)s/.exec(l);
      return m === null ? [] : [[m[1]!, { exit: Number(m[2]), seconds: Number(m[3]) }]];
    }),
);

const pins = {
  P1_informedBeatsAuto: {
    ...probeMeta("informed.json"),
    pass: "good +3 to +6 points, random at least +3 (point estimates)",
    byBot: informed,
    passed: {
      good: gain(informed, "good") >= 0.03 && gain(informed, "good") <= 0.06,
      random: gain(informed, "random") >= 0.03,
    },
  },
  P2_hindsightBounded: {
    ...probeMeta("oracle.json"),
    pass: "oracle at most +10 points, good and random (point estimates)",
    byBot: oracle,
    passed: { good: gain(oracle, "good") <= 0.1, random: gain(oracle, "random") <= 0.1 },
  },
  P3_noopIsFree: {
    ...probeMeta("noop.json"),
    pass: "no-op costs at most 0.5 points, good and random",
    byBot: noop,
    passed: { good: gain(noop, "good") >= -0.005, random: gain(noop, "random") >= -0.005 },
  },
  P4_shootoutsRewardQuality: {
    ...probeMeta("shootouts.json"),
    pass: "at least 5,000 shootouts; top edge quartile minus bottom at least 10 points of user win rate, intervals not overlapping",
    cups: so.cups,
    knockoutMatches: so.knockoutMatches,
    shootouts: so.shootouts,
    shootoutRate: so.shootoutRate,
    quartiles: so.quartiles,
    topMinusBottom: so.topMinusBottom,
    passed: so.shootouts >= 5000 && so.topMinusBottom.value >= 0.1 && q1.hi < q4.lo,
  },
  P5_flawlessBuckets: {
    command: "pnpm calibrate --n 5000 --coeffs v7",
    n: calibrate.n,
    seeds: "cal:<row>:<i>, bot rng bot:<row>:<i>, i = 0..n-1, pooled over every row and bot",
    pass: "each bucket's flawless rate inside the v4 Wilson interval",
    buckets,
    passed: buckets.every((b) => b.pass),
  },
  P6_goodPlayer: {
    command: "pnpm calibrate --n 5000 --coeffs v7",
    n: calibrate.n,
    seeds: "cal:<row>:<i>, bot rng bot:<row>:<i>, i = 0..n-1",
    pass: "cup8-full good mean wins 5.8 to 6.2; careless 151 (kanto151 random) 3 to 4 wins",
    good,
    careless151: careless,
    passed:
      good.meanWins >= 5.8 &&
      good.meanWins <= 6.2 &&
      careless.meanWins >= 3 &&
      careless.meanWins <= 4,
  },
  P7_winCurve: {
    command: "pnpm exec tsx scripts/calibration/win-curve.mts --n 5000 --coeffs v7",
    n: 5000,
    seeds: 'curve:<gap>:<i>, flat user lines at 800, G1 roster of buildLadder("probe")',
    pass: "every row within 0.03 absolute of the v4 table",
    worst: { gap: worstRow.gap, maxAbsDiff: worstRow.maxAbsDiff },
    rows: curve,
    passed: curve.every((r) => r.maxAbsDiff <= 0.03 + 1e-9),
  },
  P8_attackingGoalShare: {
    command: "pnpm calibrate --n 5000 --coeffs v7",
    pass: "ST, W and AM score 70% to 80% of user goals",
    share: wilson(Math.round(attacking), calibrate.goals.total),
    byRole: calibrate.goals.byRole,
    passed: calibrate.goals.attackingShare >= 0.7 && calibrate.goals.attackingShare <= 0.8,
  },
  P9_typeMatchups: {
    applicable: false,
    reason:
      "6b7 does not exist: the decision 10 prototype measured a good-bot squad share of 11.1% against the 18% pin (calibration-probe.md).",
    squadShareOfVariance: Object.fromEntries(
      Object.entries(luck).map(([bot, r]) => [bot, r.squadShareOfVariance]),
    ),
  },
};

const summary = {
  engine: "pokedraft-engine-7 candidate (ENGINE_COEFFICIENTS_V7)",
  head: args.head ?? null,
  note: "Proportions are count of n with a 95% Wilson interval; differences against auto use Newcombe's hybrid score interval; mean wins use a 95% normal interval; squad share of variance uses a seeded 1,000-resample percentile bootstrap over squads. Pins pass on point estimates unless the pin names an interval.",
  pins,
  reported: {
    penalties: kinds.penalty,
    missedPenaltiesPerCup: null as number | null,
    opponentInjuries: kinds.injuries,
    headerShareByAttackerAer: kinds.headerShareByAttackerAer,
    goalKinds: { user: kinds.user, opp: kinds.opp },
    knockout: upsets.knockout,
    upsetCurve: upsets.curve,
    formations: json("formations.json").results.flat(),
    luck,
  },
  achievements: {
    command: "pnpm exec tsx scripts/audit/achievements-rate.mts --n 200 --coeffs v7",
    seeds: "achievements-0 to achievements-199, good bot, cup8 4-3-3 classic3",
    giantKiller: {
      gap: 100,
      earned: giantKiller,
      insideTwoToTwentyPercent: giantKiller.p >= 0.02 && giantKiller.p <= 0.2,
    },
    hatTrickHero: earned("hat-trick-hero"),
  },
  wallSecondsOnThisMachine: walls,
  sources,
};
const pen = kinds.penalty as { saved: number; missed: number };
// Saved and missed penalties, both sides, per good-bot cup (one cup per drafted squad).
summary.reported.missedPenaltiesPerCup = (pen.saved + pen.missed) / (kinds.squads as number);

writeFileSync(args.out, `${JSON.stringify(summary, null, 1)}\n`);
process.stderr.write(`wrote ${args.out}\n`);
