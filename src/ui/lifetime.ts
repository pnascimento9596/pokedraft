import { z } from "zod";
import { FORMATION_IDS, type CupFinish, type FormationId } from "@/engine/types";
import { cyrb128 } from "@/lib/rng";
import { loadHistory, recordRun, STAT_BUCKETS, type RunRecord, type StatBucket } from "./runs";
import { readJson, writeJson } from "./storage";

// Lifetime totals live apart from the 50-run history and are never trimmed. Each completed run is
// counted once, keyed by a hash of its token, so a reload, a re-render or reopening an old run
// that already fell out of the history adds nothing.

export const LIFETIME_KEY = "pokedraft:lifetime:v1";
/** Counted-run keys kept, newest first. Only a run replayed after this many newer runs could count twice. */
export const COUNTED_LIMIT = 1000;
export const FINISH_ORDER = [
  "group",
  "R32",
  "R16",
  "QF",
  "SF",
  "F",
  "champion",
] as const satisfies readonly CupFinish[];

export interface BucketTotals {
  readonly runs: number;
  readonly cupsWon: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  /** Runs whose goals are known. Records saved before goals were stored carry none. */
  readonly goalRuns: number;
  readonly bestFinish: CupFinish | null;
}

export interface FormationTotals {
  readonly runs: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}

export interface LifetimeTotals {
  readonly buckets: Readonly<Record<StatBucket, BucketTotals>>;
  /** Ranked runs only, the same scope as the career view's formation win rates. */
  readonly formations: Readonly<Partial<Record<FormationId, FormationTotals>>>;
  readonly counted: readonly string[];
  /** Runs taken from the retained history when lifetime tracking started, 0 when none. */
  readonly backfilledRuns: number;
}

const Count = z.number().int().nonnegative();
const FinishSchema = z.enum(FINISH_ORDER);
const BucketTotalsSchema = z
  .object({
    runs: Count,
    cupsWon: Count,
    wins: Count,
    draws: Count,
    losses: Count,
    goalsFor: Count,
    goalsAgainst: Count,
    goalRuns: Count,
    bestFinish: FinishSchema.nullable(),
  })
  .refine((t) => t.cupsWon <= t.runs && t.goalRuns <= t.runs, "counts exceed runs");
const FormationTotalsSchema = z.object({ runs: Count, wins: Count, draws: Count, losses: Count });
export const LifetimeSchema = z.object({
  v: z.literal(1),
  buckets: z.object(
    Object.fromEntries(STAT_BUCKETS.map((b) => [b, BucketTotalsSchema])) as Record<
      StatBucket,
      typeof BucketTotalsSchema
    >,
  ),
  formations: z.partialRecord(
    z.enum(FORMATION_IDS as unknown as [FormationId, ...FormationId[]]),
    FormationTotalsSchema,
  ),
  counted: z
    .array(z.string().regex(/^[0-9a-f]{16}$/))
    .max(COUNTED_LIMIT)
    .refine((keys) => new Set(keys).size === keys.length, "repeated run keys"),
  backfilledRuns: Count,
});
export type StoredLifetime = z.infer<typeof LifetimeSchema>;

const EMPTY_BUCKET: BucketTotals = {
  runs: 0,
  cupsWon: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalRuns: 0,
  bestFinish: null,
};

export function emptyLifetime(): LifetimeTotals {
  return {
    buckets: Object.fromEntries(STAT_BUCKETS.map((b) => [b, EMPTY_BUCKET])) as Record<
      StatBucket,
      BucketTotals
    >,
    formations: {},
    counted: [],
    backfilledRuns: 0,
  };
}

export function runKey(token: string): string {
  const [a, b] = cyrb128(token);
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

export function betterFinish(a: CupFinish | null, b: CupFinish | null): CupFinish | null {
  if (a === null) return b;
  if (b === null) return a;
  return FINISH_ORDER.indexOf(b) > FINISH_ORDER.indexOf(a) ? b : a;
}

function addRun(bucket: BucketTotals, run: RunRecord): BucketTotals {
  const goals = run.goalsFor !== undefined && run.goalsAgainst !== undefined;
  return {
    runs: bucket.runs + 1,
    cupsWon: bucket.cupsWon + Number(run.finish === "champion"),
    wins: bucket.wins + run.wins,
    draws: bucket.draws + run.draws,
    losses: bucket.losses + run.losses,
    goalsFor: bucket.goalsFor + (goals ? run.goalsFor! : 0),
    goalsAgainst: bucket.goalsAgainst + (goals ? run.goalsAgainst! : 0),
    goalRuns: bucket.goalRuns + Number(goals),
    bestFinish: betterFinish(bucket.bestFinish, run.finish),
  };
}

export function isRanked(run: RunRecord): boolean {
  return !run.friendly && run.bucket !== "builder";
}

/** Adds one completed run. Returns the same object when the run was already counted. */
export function countRun(totals: LifetimeTotals, run: RunRecord): LifetimeTotals {
  const key = runKey(run.token);
  if (totals.counted.includes(key)) return totals;
  const formation = totals.formations[run.formation] ?? { runs: 0, wins: 0, draws: 0, losses: 0 };
  return {
    buckets: { ...totals.buckets, [run.bucket]: addRun(totals.buckets[run.bucket], run) },
    formations: isRanked(run)
      ? {
          ...totals.formations,
          [run.formation]: {
            runs: formation.runs + 1,
            wins: formation.wins + run.wins,
            draws: formation.draws + run.draws,
            losses: formation.losses + run.losses,
          },
        }
      : totals.formations,
    counted: [key, ...totals.counted].slice(0, COUNTED_LIMIT),
    backfilledRuns: totals.backfilledRuns,
  };
}

/** The starting totals for a browser that kept history before lifetime tracking existed. */
export function backfill(history: readonly RunRecord[]): LifetimeTotals {
  const totals = [...history].reverse().reduce(countRun, emptyLifetime());
  return { ...totals, backfilledRuns: totals.counted.length };
}

export function overall(totals: LifetimeTotals): BucketTotals {
  return STAT_BUCKETS.reduce<BucketTotals>((sum, b) => {
    const t = totals.buckets[b];
    return {
      runs: sum.runs + t.runs,
      cupsWon: sum.cupsWon + t.cupsWon,
      wins: sum.wins + t.wins,
      draws: sum.draws + t.draws,
      losses: sum.losses + t.losses,
      goalsFor: sum.goalsFor + t.goalsFor,
      goalsAgainst: sum.goalsAgainst + t.goalsAgainst,
      goalRuns: sum.goalRuns + t.goalRuns,
      bestFinish: betterFinish(sum.bestFinish, t.bestFinish),
    };
  }, EMPTY_BUCKET);
}

function larger(
  a: FormationTotals | undefined,
  b: FormationTotals | undefined,
): FormationTotals | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return b.runs > a.runs ? b : a;
}

// Two sets of totals can describe overlapping runs (the same browser backed up twice), and the
// overlap cannot be measured from totals alone, so adding them could count a run twice. Each
// figure in a mode takes the larger of the two sides: no side's count exceeds the true combined
// count, so the result never counts a run twice and never lowers a figure. A formation keeps the
// side with more runs whole, so its win rate is one side's real rate and never a blend. Repeating
// a merge changes nothing.
export function mergeLifetime(local: LifetimeTotals, imported: LifetimeTotals): LifetimeTotals {
  const buckets = Object.fromEntries(
    STAT_BUCKETS.map((b) => {
      const a = local.buckets[b];
      const c = imported.buckets[b];
      const merged: BucketTotals = {
        runs: Math.max(a.runs, c.runs),
        cupsWon: Math.max(a.cupsWon, c.cupsWon),
        wins: Math.max(a.wins, c.wins),
        draws: Math.max(a.draws, c.draws),
        losses: Math.max(a.losses, c.losses),
        goalsFor: Math.max(a.goalsFor, c.goalsFor),
        goalsAgainst: Math.max(a.goalsAgainst, c.goalsAgainst),
        goalRuns: Math.max(a.goalRuns, c.goalRuns),
        bestFinish: betterFinish(a.bestFinish, c.bestFinish),
      };
      return [b, merged];
    }),
  ) as Record<StatBucket, BucketTotals>;
  const formations: Partial<Record<FormationId, FormationTotals>> = {};
  for (const id of FORMATION_IDS) {
    const picked = larger(local.formations[id], imported.formations[id]);
    if (picked !== undefined) formations[id] = picked;
  }
  return {
    buckets,
    formations,
    counted: [...new Set([...local.counted, ...imported.counted])].slice(0, COUNTED_LIMIT),
    backfilledRuns: Math.max(local.backfilledRuns, imported.backfilledRuns),
  };
}

export function toStored(totals: LifetimeTotals): StoredLifetime {
  return { v: 1, ...totals, counted: [...totals.counted] };
}

export function loadLifetime(): LifetimeTotals | null {
  const parsed = LifetimeSchema.safeParse(readJson<unknown>(LIFETIME_KEY, null));
  if (!parsed.success) return null;
  return fromStored(parsed.data);
}

export function fromStored({
  buckets,
  formations,
  counted,
  backfilledRuns,
}: StoredLifetime): LifetimeTotals {
  return { buckets, formations, counted, backfilledRuns };
}

export function writeLifetime(totals: LifetimeTotals): void {
  writeJson(LIFETIME_KEY, toStored(totals));
}

/** The stored totals, or totals backfilled once from the retained history and saved. */
export function ensureLifetime(): LifetimeTotals {
  const stored = loadLifetime();
  if (stored !== null) return stored;
  const started = backfill(loadHistory());
  writeLifetime(started);
  return started;
}

/** Records a finished run in the history, the per-mode bests and the lifetime totals. */
export function recordCompletedRun(run: RunRecord): void {
  const lifetime = ensureLifetime();
  recordRun(run);
  const next = countRun(lifetime, run);
  if (next !== lifetime) writeLifetime(next);
}
