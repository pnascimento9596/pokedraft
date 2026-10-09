import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { performance } from "node:perf_hooks";
import { POKEDEX } from "@/data/pokedex";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "@/engine/coefficients";
import { runCup } from "@/engine/cup";
import { applyAction, createDraft, toFullLineup } from "@/engine/draft";
import { FORMATIONS } from "@/engine/formations";
import { createEngineRng } from "@/engine/rng";
import { SPECIES, speciesById } from "@/engine/species";
import { rateTeam } from "@/engine/team";
import {
  DraftError,
  ENGINE_VERSION,
  GENS,
  type CupFinish,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type FullLineup,
  type Role,
  type Seed,
  type SlotRef,
  type Species,
  type SpeciesId,
} from "@/engine/types";
import { BOT_NAMES, BOTS, GOOD, bestFor, pickable, type BotName } from "./calibration/bots";

interface Row {
  readonly id: string;
  readonly settings: DraftSettings;
}

const FORMATION = "4-3-3";
const ROWS: readonly Row[] = [
  {
    id: "cup8-full",
    settings: {
      mode: "cup8",
      formation: FORMATION,
      gens: GENS,
      style: "classic3",
      order: "squadFirst",
    },
  },
  {
    id: "cup8-full-open",
    settings: {
      mode: "cup8",
      formation: FORMATION,
      gens: GENS,
      style: "open",
      order: "squadFirst",
    },
  },
  {
    id: "cup8-retro",
    settings: {
      mode: "cup8",
      formation: FORMATION,
      gens: [1, 2, 3, 4],
      style: "classic3",
      order: "squadFirst",
    },
  },
  { id: "kanto151", settings: { mode: "kanto151", formation: FORMATION, order: "squadFirst" } },
  {
    id: "builder-leg-on",
    settings: { mode: "builder", formation: FORMATION, gens: GENS, legendaries: true },
  },
  {
    id: "builder-leg-off",
    settings: { mode: "builder", formation: FORMATION, gens: GENS, legendaries: false },
  },
];
const CARRYOVER_ROW = "cup8-full";
const CARRYOVER_BOT: BotName = "good";
const FINISHES: readonly CupFinish[] = ["group", "R32", "R16", "QF", "SF", "F", "champion"];
const MAX_STEPS = 200;
const Z95 = 1.96;
const ERROR_SAMPLES = 3;

const { values: args } = parseArgs({
  options: {
    n: { type: "string", default: "5000" },
    coeffs: { type: "string" },
    rows: { type: "string" },
    out: { type: "string", default: "scripts/calibration/out/latest.json" },
    quiet: { type: "boolean", default: false },
  },
});

const N = Number(args.n);
if (!Number.isSafeInteger(N) || N < 1)
  throw new RangeError(`--n must be a positive integer, got ${args.n}`);

type Json = number | string | boolean | null | Json[] | { [k: string]: Json };

function deepMerge(base: Json, patch: Json, at: string): Json {
  const isObject = (v: Json): v is { [k: string]: Json } =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  if (!isObject(patch)) {
    if (
      isObject(base) ||
      typeof base !== typeof patch ||
      Array.isArray(base) !== Array.isArray(patch)
    ) {
      throw new TypeError(
        `--coeffs ${at || "root"}: expected ${JSON.stringify(base)}-shaped value`,
      );
    }
    return patch;
  }
  if (!isObject(base))
    throw new TypeError(`--coeffs ${at}: expected a ${typeof base}, got an object`);
  const out: { [k: string]: Json } = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in base)) throw new TypeError(`--coeffs ${at}.${k}: unknown coefficient`);
    out[k] = deepMerge(base[k]!, v, `${at}.${k}`);
  }
  return out;
}

const COEFFS: EngineCoefficients =
  args.coeffs === undefined
    ? ENGINE_COEFFICIENTS
    : (deepMerge(
        ENGINE_COEFFICIENTS as unknown as Json,
        JSON.parse(readFileSync(args.coeffs, "utf8")) as Json,
        "",
      ) as unknown as EngineCoefficients);

const selectedRows: readonly Row[] =
  args.rows === undefined
    ? ROWS
    : args.rows.split(",").map((id) => {
        const row = ROWS.find((r) => r.id === id.trim());
        if (row === undefined)
          throw new RangeError(`unknown row ${id}; known: ${ROWS.map((r) => r.id).join(", ")}`);
        return row;
      });

interface PickRecord {
  readonly species: SpeciesId;
  readonly slot: SlotRef;
  readonly pickable: readonly SpeciesId[];
}

interface RunRecord {
  readonly score: number;
  readonly wins: number;
  readonly flawless: boolean;
  readonly finish: CupFinish;
  readonly specials: number;
  readonly rerolls: number;
  readonly lineup: FullLineup;
  readonly picks: readonly PickRecord[];
}

function applyFirst(
  state: DraftState,
  candidates: readonly DraftAction[],
): { state: DraftState; action: DraftAction } {
  for (const action of candidates) {
    try {
      return { state: applyAction(state, action), action };
    } catch (e) {
      if (action.type === "reroll" && e instanceof DraftError && e.code === "noAlternatives")
        continue;
      throw e;
    }
  }
  throw new Error("every candidate action was refused");
}

function runOne(row: Row, bot: BotName, i: number): RunRecord {
  const seed = `cal:${row.id}:${i}` as Seed;
  const rng = createEngineRng(`bot:${row.id}:${i}`);
  let state = createDraft(row.settings, seed);
  const picks: PickRecord[] = [];
  if (row.settings.mode === "builder") {
    for (const action of BOTS[bot].build(state, rng)) state = applyAction(state, action);
  } else {
    for (let step = 0; state.phase.kind !== "complete"; step++) {
      if (step >= MAX_STEPS) throw new Error(`draft did not finish in ${MAX_STEPS} steps`);
      const before = state;
      const applied = applyFirst(state, BOTS[bot].decide(state, rng));
      state = applied.state;
      if (applied.action.type === "pick" && before.phase.kind === "choosing") {
        picks.push({
          species: applied.action.species,
          slot: applied.action.slot ?? before.phase.slot!,
          pickable: pickable(before),
        });
      }
    }
  }
  const lineup = toFullLineup(state);
  const cup = runCup(lineup, seed, row.settings.mode, COEFFS);
  return {
    score: cup.rating.score,
    wins: cup.wins,
    flawless: cup.flawless,
    finish: cup.finish,
    specials: [...lineup.starters, ...lineup.bench].filter((id) => speciesById(id).special).length,
    rerolls: state.rerollsUsed,
    lineup,
    picks,
  };
}

function quantile(sorted: readonly number[], q: number): number {
  return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)]!;
}

function meanOf(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

function wilson(
  k: number,
  n: number,
): { count: number; n: number; p: number; lo: number; hi: number } {
  if (n === 0) return { count: k, n, p: Number.NaN, lo: Number.NaN, hi: Number.NaN };
  const p = k / n;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { count: k, n, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

interface Carryover {
  readonly id: number;
  readonly title: string;
  readonly predicate: string;
  readonly roles: readonly Role[];
  readonly species: readonly Species[];
}

const DEX = new Map(POKEDEX.map((p) => [p.id, p]));
const dex = (s: Species) => DEX.get(s.id)!;

function tails(values: readonly number[]): { low: number; high: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const k = Math.ceil(0.05 * sorted.length);
  return { low: sorted[k - 1]!, high: sorted[sorted.length - k]! };
}
const HEIGHT = tails(SPECIES.map((s) => dex(s).heightDm));
const WEIGHT = tails(SPECIES.map((s) => dex(s).weightHg));

const CARRYOVERS: readonly Carryover[] = [
  {
    id: 1,
    title: "claw/blade handling",
    predicate: 'weaknesses includes "handling" && attrs.HAN >= 70 && pokedex.shape !== "quadruped"',
    roles: ["GK"],
    species: SPECIES.filter(
      (s) => s.weaknesses.includes("handling") && s.attrs.HAN >= 70 && dex(s).shape !== "quadruped",
    ),
  },
  {
    id: 2,
    title: "no size signal for HAN/DIV",
    predicate: `bestRoles includes "GK" && (heightDm <= ${HEIGHT.low} || heightDm >= ${HEIGHT.high} || weightHg <= ${WEIGHT.low} || weightHg >= ${WEIGHT.high}); thresholds are the ceil(5%)-th smallest and largest over all ${SPECIES.length} species`,
    roles: ["GK"],
    species: SPECIES.filter((s) => {
      const p = dex(s);
      return (
        s.bestRoles.includes("GK") &&
        (p.heightDm <= HEIGHT.low ||
          p.heightDm >= HEIGHT.high ||
          p.weightHg <= WEIGHT.low ||
          p.weightHg >= WEIGHT.high)
      );
    }),
  },
  {
    id: 3,
    title: "pace-weak FB first",
    predicate: 'weaknesses includes "pace" && bestRoles[0] === "FB"',
    roles: ["FB"],
    species: SPECIES.filter((s) => s.weaknesses.includes("pace") && s.bestRoles[0] === "FB"),
  },
  {
    id: 4,
    title: "Barboach, Burmy, Tynamo",
    predicate: "id in {339, 412, 602}",
    roles: ["W", "WB"],
    species: SPECIES.filter((s) => [339, 412, 602].includes(s.id)),
  },
  {
    id: 5,
    title: "squiggle shape",
    predicate: 'pokedex.shape === "squiggle"',
    roles: ["CB", "ST"],
    species: SPECIES.filter((s) => dex(s).shape === "squiggle"),
  },
];

function replaced(lineup: FullLineup, ref: SlotRef, id: SpeciesId): FullLineup {
  if (ref.kind === "starter") {
    return {
      ...lineup,
      starters: lineup.starters.with(ref.index, id) as unknown as FullLineup["starters"],
    };
  }
  return { ...lineup, bench: lineup.bench.with(ref.index, id) as unknown as FullLineup["bench"] };
}

function measureCarryover(item: Carryover, runs: readonly RunRecord[]) {
  const flagged = new Set<number>(item.species.map((s) => s.id));
  const formation = FORMATIONS[FORMATION];
  let draftsWithPlacement = 0;
  const byRole: Record<string, number> = Object.fromEntries(item.roles.map((r) => [r, 0]));
  const deltas: number[] = [];
  let noAlternative = 0;
  let placements = 0;
  for (const run of runs) {
    let hit = false;
    const squad = new Set<number>([...run.lineup.starters, ...run.lineup.bench]);
    for (const p of run.picks) {
      if (p.slot.kind !== "starter" || !flagged.has(p.species)) continue;
      const role = formation.slots[p.slot.index]!.role;
      if (!item.roles.includes(role)) continue;
      hit = true;
      placements++;
      byRole[role]! += 1;
      const alt = bestFor(
        GOOD,
        formation,
        p.pickable.filter((id) => id !== p.species && !squad.has(id)),
        [p.slot],
      );
      if (alt === null) {
        noAlternative++;
        continue;
      }
      deltas.push(
        rateTeam(run.lineup, COEFFS).score -
          rateTeam(replaced(run.lineup, p.slot, alt.species), COEFFS).score,
      );
    }
    if (hit) draftsWithPlacement++;
  }
  return {
    id: item.id,
    title: item.title,
    predicate: item.predicate,
    roles: item.roles,
    species: item.species.map((s) => ({ id: s.id as number, name: s.name })),
    drafts: runs.length,
    draftsWithPlacement,
    placementRate: runs.length === 0 ? Number.NaN : draftsWithPlacement / runs.length,
    placements,
    placementsByRole: byRole,
    delta: {
      n: deltas.length,
      noAlternative,
      mean: deltas.length === 0 ? null : meanOf(deltas),
      min: deltas.length === 0 ? null : Math.min(...deltas),
      max: deltas.length === 0 ? null : Math.max(...deltas),
    },
  };
}

const started = performance.now();
const log = (msg: string) => {
  if (!args.quiet) process.stderr.write(`${msg}\n`);
};

const results = [];
const pooled: { score: number; wins: number; flawless: boolean }[] = [];
let carryoverRuns: RunRecord[] | null = null;
let totalErrors = 0;

for (const row of selectedRows) {
  for (const bot of BOT_NAMES) {
    const runs: RunRecord[] = [];
    const errorSamples: string[] = [];
    let errors = 0;
    for (let i = 0; i < N; i++) {
      try {
        runs.push(runOne(row, bot, i));
      } catch (e) {
        errors++;
        if (errorSamples.length < ERROR_SAMPLES) errorSamples.push(`run ${i}: ${String(e)}`);
      }
    }
    totalErrors += errors;
    const scores = runs.map((r) => r.score).sort((a, b) => a - b);
    const finish = Object.fromEntries(
      FINISHES.map((f) => [f, runs.filter((r) => r.finish === f).length]),
    );
    results.push({
      row: row.id,
      bot,
      settings: row.settings,
      errors,
      errorSamples,
      draftsCompleted: runs.length,
      cupsRun: runs.length,
      score: {
        mean: meanOf(scores),
        median: quantile(scores, 0.5),
        p10: quantile(scores, 0.1),
        p90: quantile(scores, 0.9),
      },
      meanWins: meanOf(runs.map((r) => r.wins)),
      flawless: wilson(runs.filter((r) => r.flawless).length, runs.length),
      finish,
      meanSpecials: meanOf(runs.map((r) => r.specials)),
      meanRerolls: meanOf(runs.map((r) => r.rerolls)),
    });
    for (const r of runs) pooled.push({ score: r.score, wins: r.wins, flawless: r.flawless });
    if (row.id === CARRYOVER_ROW && bot === CARRYOVER_BOT) carryoverRuns = runs;
    log(
      `${row.id} ${bot}: ${runs.length} runs, ${errors} errors, ${((performance.now() - started) / 1000).toFixed(1)}s`,
    );
  }
}

function bucketStats(label: string, lo: number, hi: number) {
  const inside = pooled.filter((r) => r.score >= lo && r.score <= hi);
  return {
    label,
    lo,
    hi,
    count: inside.length,
    meanWins: meanOf(inside.map((r) => r.wins)),
    flawless: wilson(inside.filter((r) => r.flawless).length, inside.length),
  };
}

const near = [
  bucketStats("840±20", 820, 860),
  bucketStats("900±20", 880, 920),
  bucketStats("950±20", 930, 970),
];
const histogram = Array.from({ length: 20 }, (_, k) =>
  bucketStats(
    k === 19 ? "950-1000" : `${k * 50}-${k * 50 + 49}`,
    k * 50,
    k === 19 ? 1000 : k * 50 + 49,
  ),
).filter((b) => b.count > 0);

const carryovers =
  carryoverRuns === null ? null : CARRYOVERS.map((item) => measureCarryover(item, carryoverRuns!));

const report = {
  engine: ENGINE_VERSION,
  n: N,
  rows: selectedRows.map((r) => r.id),
  bots: BOT_NAMES,
  coeffsPath: args.coeffs ?? null,
  coefficients: COEFFS,
  totalErrors,
  results,
  buckets: { near, histogram },
  carryovers,
};

const json = `${JSON.stringify(report, null, 2)}\n`;
mkdirSync(path.dirname(args.out), { recursive: true });
writeFileSync(args.out, json);

const f1 = (v: number) => (Number.isNaN(v) ? "n/a" : v.toFixed(1));
const f2 = (v: number) => (Number.isNaN(v) ? "n/a" : v.toFixed(2));
const pct = (v: number) => (Number.isNaN(v) ? "n/a" : `${(100 * v).toFixed(1)}%`);
const ci = (w: { count: number; p: number; lo: number; hi: number }) =>
  `${w.count} = ${pct(w.p)} [${pct(w.lo)}, ${pct(w.hi)}]`;
const out: string[] = [];
const table = (head: readonly string[], rows: readonly (readonly (string | number)[])[]) => {
  out.push(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
  for (const r of rows) out.push(`| ${r.join(" | ")} |`);
  out.push("");
};

out.push(
  `# Calibration (${ENGINE_VERSION})`,
  "",
  `N = ${N} drafts per row and bot. Formation ${FORMATION}. Coefficients: ${args.coeffs ?? "ENGINE_COEFFICIENTS"}. Total errors: ${totalErrors}. JSON: ${args.out} (sha256 ${createHash("sha256").update(json).digest("hex")}).`,
  "",
  "Quantiles are nearest-rank. P(8-0) is count = share [95% Wilson interval].",
  "",
  "## Rows",
  "",
);
table(
  [
    "row",
    "bot",
    "errors",
    "drafts",
    "cups",
    "score mean",
    "median",
    "p10",
    "p90",
    "mean wins",
    "P(8-0)",
    "mean specials",
    "mean rerolls",
  ],
  results.map((r) => [
    r.row,
    r.bot,
    r.errors,
    r.draftsCompleted,
    r.cupsRun,
    f1(r.score.mean),
    r.score.median,
    r.score.p10,
    r.score.p90,
    f2(r.meanWins),
    ci(r.flawless),
    f2(r.meanSpecials),
    f2(r.meanRerolls),
  ]),
);
out.push("## Finish distribution", "");
table(
  ["row", "bot", ...FINISHES],
  results.map((r) => [r.row, r.bot, ...FINISHES.map((f) => r.finish[f]!)]),
);
out.push(`## Score buckets (pooled over ${pooled.length} runs: every selected row and bot)`, "");
const bucketRows = (bs: readonly ReturnType<typeof bucketStats>[]) =>
  bs.map((b) => [b.label, b.count, f2(b.meanWins), ci(b.flawless)]);
table(["Team Score", "runs", "mean wins", "P(8-0)"], bucketRows(near));
out.push("### 50-point histogram (empty buckets omitted)", "");
table(["Team Score", "runs", "mean wins", "P(8-0)"], bucketRows(histogram));
if (carryovers === null) {
  out.push(`## Carryovers`, "", `NOT RUN: row ${CARRYOVER_ROW} was not selected.`, "");
} else {
  out.push(`## Carryovers (${CARRYOVER_BOT} bot on ${CARRYOVER_ROW})`, "");
  out.push(
    "Placement rate is the share of drafts with at least one flagged species in a starter slot of a flagged role. Score delta is Team Score of the final lineup minus Team Score with that species replaced by the good bot's best other option from the same pick's pickable set (excluding species already in the final squad).",
    "",
  );
  table(
    [
      "#",
      "item",
      "flagged",
      "roles",
      "placement rate",
      "placements (by role)",
      "delta n",
      "no alternative",
      "mean delta",
      "min",
      "max",
    ],
    carryovers.map((c) => [
      c.id,
      c.title,
      c.species.length,
      c.roles.join("/"),
      `${c.draftsWithPlacement}/${c.drafts} = ${pct(c.placementRate)}`,
      `${c.placements} (${Object.entries(c.placementsByRole)
        .map(([r, k]) => `${r} ${k}`)
        .join(", ")})`,
      c.delta.n,
      c.delta.noAlternative,
      c.delta.mean === null ? "n/a" : f2(c.delta.mean),
      c.delta.min ?? "n/a",
      c.delta.max ?? "n/a",
    ]),
  );
  for (const c of carryovers) {
    out.push(
      `- **${c.id}. ${c.title}.** Predicate \`${c.predicate}\`. ${c.species.length} species: ${c.species.map((s) => `${s.id} ${s.name}`).join(", ")}.`,
    );
  }
  out.push("");
}
process.stdout.write(`${out.join("\n")}\n`);
log(`wall time ${((performance.now() - started) / 1000).toFixed(1)}s`);
if (totalErrors > 0) process.exitCode = 1;
