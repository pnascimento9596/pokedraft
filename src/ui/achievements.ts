import {
  FORMATION_IDS,
  type CupResult,
  type DraftSettings,
  type FormationId,
  type MatchResult,
} from "@/engine/types";
import type { RunRecord } from "./runs";

export const ACHIEVEMENT_IDS = [
  "first-flawless",
  "hat-trick-hero",
  "every-formation",
  "kanto-151-champion",
  "comeback",
  "giant-killer",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const ACHIEVEMENT_LABEL: Readonly<Record<AchievementId, string>> = {
  "first-flawless": "First Flawless",
  "hat-trick-hero": "Hat-trick hero",
  "every-formation": "Champion with every formation",
  "kanto-151-champion": "151 champion",
  comeback: "Comeback",
  "giant-killer": "Giant killer",
};

/** The day runs started storing per-match achievements. Older records cannot prove these three. */
export const ACHIEVEMENTS_SINCE = "20 October 2026";

/** 150 earned in 1.0% of 200 good-bot cups, below the 2% floor; 100 earned in 2.5%. */
export const GIANT_KILLER_GAP = 100;

// The chip shows what one run proves on its own. First Flawless needs the player's earlier runs.
const CHIP_ORDER: readonly AchievementId[] = [
  "giant-killer",
  "comeback",
  "hat-trick-hero",
  "kanto-151-champion",
];

export interface Earn {
  readonly at: string;
  readonly token: string;
}
export type Earned = Readonly<Partial<Record<AchievementId, Earn>>>;

export interface AchievementState {
  readonly earned: Earned;
  readonly formationTitles: readonly FormationId[];
}

type Played = Extract<MatchResult, { status: "played" }>;

function hatTrick(match: Played): boolean {
  const goals = new Map<number, number>();
  for (const goal of match.goals) {
    if (goal.side !== "user") continue;
    const count = (goals.get(goal.scorer) ?? 0) + 1;
    if (count >= 3) return true;
    goals.set(goal.scorer, count);
  }
  return false;
}

function comeback(match: Played): boolean {
  if (match.outcome !== "W" || match.shootout !== null) return false;
  let user = 0;
  let opp = 0;
  for (const goal of [...match.goals].sort((a, b) => a.minute - b.minute)) {
    if (goal.side === "user") user++;
    else opp++;
    if (opp > user) return true;
  }
  return false;
}

function giantKill(match: Played): boolean {
  return match.outcome === "W" && match.opponent.score - match.rating >= GIANT_KILLER_GAP;
}

/** What one run earns, in table order. Friendlies earn nothing: a builder can stack any squad. */
export function runAchievements(
  draft: { readonly settings: DraftSettings },
  cup: CupResult,
): AchievementId[] {
  const { mode } = draft.settings;
  if (mode === "builder") return [];
  const played = cup.matches.filter((m): m is Played => m.status === "played");
  const earned: Record<AchievementId, boolean> = {
    "first-flawless": cup.flawless,
    "hat-trick-hero": played.some(hatTrick),
    "every-formation": false,
    "kanto-151-champion": mode === "kanto151" && cup.finish === "champion",
    comeback: played.some(comeback),
    "giant-killer": played.some(giantKill),
  };
  return ACHIEVEMENT_IDS.filter((id) => earned[id]);
}

export function chipAchievement(ids: readonly AchievementId[]): AchievementId | null {
  return CHIP_ORDER.find((id) => ids.includes(id)) ?? null;
}

export function isRanked(run: RunRecord): boolean {
  return !run.friendly && run.bucket !== "builder";
}

// A record saved before achievements were stored only proves what its summary fields show.
function storedAchievements(run: RunRecord): readonly AchievementId[] {
  if (!isRanked(run)) return [];
  if (run.achievements !== undefined) return run.achievements;
  return ACHIEVEMENT_IDS.filter(
    (id) =>
      (id === "first-flawless" && run.flawless) ||
      (id === "kanto-151-champion" && run.bucket === "kanto151" && run.finish === "champion"),
  );
}

function time(at: string): number {
  const t = Date.parse(at);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function earlier(a: Earn | undefined, b: Earn | undefined): Earn | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return time(b.at) < time(a.at) ? b : a;
}

export function mergeEarned(a: Earned, b: Earned): Earned {
  const out: Partial<Record<AchievementId, Earn>> = {};
  for (const id of ACHIEVEMENT_IDS) {
    const kept = earlier(a[id], b[id]);
    if (kept !== undefined) out[id] = kept;
  }
  return out;
}

export function mergeTitles(
  a: readonly FormationId[],
  b: readonly FormationId[],
): readonly FormationId[] {
  return FORMATION_IDS.filter((f) => a.includes(f) || b.includes(f));
}

/** Adds one run's earns. Each achievement keeps its earliest run, so repeating a run changes nothing. */
export function earnRun(state: AchievementState, run: RunRecord): AchievementState {
  const earn: Earn = { at: run.at, token: run.token };
  const fromRun: Partial<Record<AchievementId, Earn>> = {};
  for (const id of storedAchievements(run)) fromRun[id] = earn;
  let titles = state.formationTitles;
  if (isRanked(run) && run.finish === "champion" && !titles.includes(run.formation)) {
    titles = mergeTitles(titles, [run.formation]);
    if (titles.length === FORMATION_IDS.length) fromRun["every-formation"] = earn;
  }
  return { earned: mergeEarned(state.earned, fromRun), formationTitles: titles };
}

export interface AchievementTile {
  readonly id: AchievementId;
  readonly label: string;
  /** The first earn, or null. Every formation can be complete with no known date after a merge. */
  readonly earned: Earn | null;
  readonly done: boolean;
  readonly progress: { readonly count: number; readonly of: number } | null;
}

/** The grid: lifetime earns plus whatever the retained history proves that the totals predate. */
export function lifetimeAchievements(
  lifetime: AchievementState,
  history: readonly RunRecord[],
): AchievementTile[] {
  const state = [...history].reverse().reduce(earnRun, {
    earned: lifetime.earned,
    formationTitles: lifetime.formationTitles,
  });
  return ACHIEVEMENT_IDS.map((id) => {
    const earned = state.earned[id] ?? null;
    const every = id === "every-formation";
    return {
      id,
      label: ACHIEVEMENT_LABEL[id],
      earned,
      done: earned !== null || (every && state.formationTitles.length === FORMATION_IDS.length),
      progress: every ? { count: state.formationTitles.length, of: FORMATION_IDS.length } : null,
    };
  });
}
