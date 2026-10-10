import type { CupFinish, CupResult, DraftSettings, FormationId } from "@/engine";
import { MODE_LABEL, STYLE_LABEL } from "./labels";
import { readJson, writeJson } from "./storage";

// Local stats are kept per mode and style because Open is easier than Classic.
export const STAT_BUCKETS = ["cup8:open", "cup8:classic3", "kanto151", "builder"] as const;
export type StatBucket = (typeof STAT_BUCKETS)[number];

export const BUCKET_LABEL: Readonly<Record<StatBucket, string>> = {
  "cup8:open": `${MODE_LABEL.cup8}, ${STYLE_LABEL.open}`,
  "cup8:classic3": `${MODE_LABEL.cup8}, ${STYLE_LABEL.classic3}`,
  kanto151: MODE_LABEL.kanto151,
  builder: "Friendly (not ranked)",
};

export function bucketOf(settings: DraftSettings): StatBucket {
  if (settings.mode === "cup8") return `cup8:${settings.style}`;
  return settings.mode;
}

export interface RunRecord {
  readonly token: string;
  readonly bucket: StatBucket;
  readonly friendly: boolean;
  readonly formation: FormationId;
  readonly score: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly finish: CupFinish;
  readonly flawless: boolean;
  readonly at: string;
}

export interface BucketStats {
  readonly runs: number;
  readonly bestScore: number | null;
  readonly bestRecord: {
    readonly wins: number;
    readonly draws: number;
    readonly losses: number;
  } | null;
}

const HISTORY_KEY = "pokedraft:history:v1";
export const HISTORY_LIMIT = 50;

export function loadHistory(): readonly RunRecord[] {
  const raw = readJson<unknown>(HISTORY_KEY, []);
  return Array.isArray(raw) ? (raw as RunRecord[]) : [];
}

export function toRecord(
  token: string,
  settings: DraftSettings,
  cup: CupResult,
  at: string,
): RunRecord {
  return {
    token,
    bucket: bucketOf(settings),
    friendly: settings.mode === "builder",
    formation: settings.formation,
    score: cup.rating.score,
    wins: cup.wins,
    draws: cup.draws,
    losses: cup.losses,
    finish: cup.finish,
    flawless: cup.flawless,
    at,
  };
}

const STATS_KEY = "pokedraft:stats:v1";

function emptyStats(): Record<StatBucket, BucketStats> {
  return Object.fromEntries(
    STAT_BUCKETS.map((b) => [b, { runs: 0, bestScore: null, bestRecord: null }]),
  ) as Record<StatBucket, BucketStats>;
}

export function loadStats(): Readonly<Record<StatBucket, BucketStats>> {
  const raw = readJson<unknown>(STATS_KEY, null);
  const out = emptyStats();
  if (typeof raw !== "object" || raw === null) return out;
  for (const b of STAT_BUCKETS) {
    const v = (raw as Record<string, BucketStats | undefined>)[b];
    if (v !== undefined && typeof v.runs === "number") out[b] = v;
  }
  return out;
}

function betterRecord(
  a: BucketStats["bestRecord"],
  b: NonNullable<BucketStats["bestRecord"]>,
): NonNullable<BucketStats["bestRecord"]> {
  if (a === null) return b;
  if (b.wins !== a.wins) return b.wins > a.wins ? b : a;
  if (b.draws !== a.draws) return b.draws > a.draws ? b : a;
  return b.losses < a.losses ? b : a;
}

export function addToStats(stats: BucketStats, run: RunRecord): BucketStats {
  return {
    runs: stats.runs + 1,
    bestScore: stats.bestScore === null ? run.score : Math.max(stats.bestScore, run.score),
    bestRecord: betterRecord(stats.bestRecord, {
      wins: run.wins,
      draws: run.draws,
      losses: run.losses,
    }),
  };
}

// Stats live apart from the 50-run history so old bests survive. A token already in the
// history is not counted again, so showing the same results twice records one run.
export function recordRun(run: RunRecord): void {
  const history = loadHistory();
  if (history.some((r) => r.token === run.token)) return;
  writeJson(HISTORY_KEY, [run, ...history].slice(0, HISTORY_LIMIT));
  const stats = { ...loadStats() };
  stats[run.bucket] = addToStats(stats[run.bucket], run);
  writeJson(STATS_KEY, stats);
}
