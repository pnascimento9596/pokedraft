import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string", default: "scripts/calibration/out" },
    out: { type: "string", default: "docs/reports/engine-7/baseline-v6.json" },
    head: { type: "string" },
  },
});

type AnyJson = Record<string, unknown> & { results: Record<string, unknown>[] };

const sources: Record<string, string> = {};
function load(name: string): AnyJson {
  const raw = readFileSync(`${args.dir}/${name}`, "utf8");
  sources[name] = createHash("sha256").update(raw).digest("hex");
  return JSON.parse(raw) as AnyJson;
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;
function round(v: unknown): unknown {
  if (typeof v === "number") return r4(v);
  if (Array.isArray(v)) return v.map(round);
  if (v !== null && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)]));
  return v;
}

function meta(r: AnyJson) {
  return { n: r.n, seeds: r.seeds, bots: r.bots, formation: r.formation, seedScheme: r.seedScheme };
}

const byBot = (r: AnyJson) =>
  Object.fromEntries(r.results.map((x) => [x.bot as string, x])) as Record<
    string,
    Record<string, unknown>
  >;

const luck = load("luck.json");
const manager = load("manager.json");
const informed = load("informed.json");
const noop = load("noop.json");
const oracle = load("oracle.json");
const upsets = load("upsets.json");
const formations = load("formations.json");
const shootouts = load("shootouts.json");
const kinds = load("kinds.json");

const calibrate = JSON.parse(readFileSync(`${args.dir}/calibrate-5000.json`, "utf8")) as {
  n: number;
  results: { row: string; bot: string; meanWins: number; flawless: unknown; cupsRun: number }[];
  buckets: { near: unknown[] };
  goals: { total: number; attackingShare: number };
};
sources["calibrate-5000.json"] = createHash("sha256")
  .update(readFileSync(`${args.dir}/calibrate-5000.json`))
  .digest("hex");

function curve(name: string) {
  const text = readFileSync(`${args.dir}/${name}`, "utf8");
  sources[name] = createHash("sha256").update(text).digest("hex");
  return text
    .split("\n")
    .filter((l) => /^\| -?\d/.test(l))
    .map((l) => {
      const [gap, groupW, groupD, koW] = l
        .split("|")
        .slice(1, 5)
        .map((x) => Number(x.trim()));
      return { gap, groupW, groupD, koW };
    });
}
const winCurve = curve("win-curve-5000.md");
const protoLuck = load("proto-luck-good.json");

const walls = Object.fromEntries(
  readFileSync(`${args.dir}/baseline.log`, "utf8")
    .split("\n")
    .flatMap((l) => {
      const m = /^(\S+) exit=0 elapsed=(\d+)s/.exec(l);
      return m === null ? [] : [[m[1]!, Number(m[2])]];
    }),
);

const arm = (r: AnyJson) =>
  Object.fromEntries(
    Object.entries(byBot(r)).map(([bot, x]) => [
      bot,
      {
        matches: x.matches,
        auto: (x.auto as Record<string, unknown>).win,
        arm: ((x.arm ?? x.oracle) as Record<string, unknown>).win,
        winMinusAuto: x.winMinusAuto,
        discordantWins: x.discordantWins,
      },
    ]),
  );

const summary = {
  engine: luck.engine,
  head: args.head ?? null,
  note: "Rounded to 4 decimals. Proportions are count of n with a 95% Wilson interval; differences use Newcombe's hybrid score interval; squad share of variance and luck mean wins use a seeded 1,000-resample percentile bootstrap over squads.",
  pins: {
    P1_informed: { ...meta(informed), byBot: arm(informed) },
    P2_oracle: { ...meta(oracle), byBot: arm(oracle) },
    P3_noop: { ...meta(noop), byBot: arm(noop) },
    P4_shootouts: { ...meta(shootouts), byBot: byBot(shootouts) },
    P9_squadShareOfVariance: {
      ...meta(luck),
      byBot: Object.fromEntries(
        Object.entries(byBot(luck)).map(([bot, x]) => [bot, x.squadShareOfVariance]),
      ),
    },
  },
  P5_P6_P8_calibrate: {
    command: "pnpm calibrate --n 5000",
    n: calibrate.n,
    seedScheme: "cal:<row>:<i>, bot rng bot:<row>:<i>, i = 0..n-1",
    buckets: calibrate.buckets.near,
    meanWins: calibrate.results.map((r) => ({
      row: r.row,
      bot: r.bot,
      cups: r.cupsRun,
      meanWins: r.meanWins,
      flawless: r.flawless,
    })),
    goals: { total: calibrate.goals.total, attackingShare: calibrate.goals.attackingShare },
  },
  P7_winCurve: {
    command: "pnpm exec tsx scripts/calibration/win-curve.mts --n 5000",
    n: 5000,
    seedScheme: 'curve:<gap>:<i>, flat user lines at 800, G1 roster of buildLadder("probe")',
    rows: winCurve,
  },
  decision10Prototype: {
    patch: "docs/reports/engine-7/type-matchup-prototype.patch",
    pass: "good-bot squad share of variance at least 0.18 (P9) and every win-curve row within 0.03 of the v4 table (P7)",
    luckGood: { ...meta(protoLuck), result: protoLuck.results[0] },
    winCurve: curve("proto-win-curve-5000.md"),
  },
  wallSecondsOnThisMachine: walls,
  luck: { ...meta(luck), byBot: byBot(luck) },
  manager: { ...meta(manager), byBot: byBot(manager) },
  upsets: { ...meta(upsets), result: upsets.results[0] },
  formations: { ...meta(formations), rows: formations.results.flat() },
  kinds: { ...meta(kinds), byBot: byBot(kinds) },
  sources,
};

writeFileSync(args.out, `${JSON.stringify(round(summary), null, 1)}\n`);
process.stderr.write(`wrote ${args.out}\n`);
