import { and, asc, count, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { ENGINE_VERSION } from "@/engine";
import { leaderboardEntries, type LeaderboardRow, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { admissionCtes, type RateLimitRule } from "@/ratelimit/store";
import { readAnyToken } from "@/ui/read-token";
import { squadOf } from "./squad-preview";
import {
  BOARD_LIMIT,
  SEED_BOARD_LIMIT,
  type BoardEntry,
  type BoardMode,
  type CoachFilter,
  type EngineFilter,
} from "../contract";

/** An all-time board lists every engine, the live one, or one named engine. */
export type Board =
  | { readonly mode: BoardMode; readonly dailyDate: string }
  | {
      readonly mode: BoardMode;
      readonly dailyDate: null;
      readonly engine: EngineFilter | { readonly version: string };
    };

/**
 * The board a submitted run is ranked on: its daily board, or the all-time board of the engine
 * that replayed it. For a live run that is the current-engine board the submit panel's link opens.
 */
export function rankedBoard(mode: BoardMode, dailyDate: string | null, engine: string): Board {
  if (dailyDate !== null) return { mode, dailyDate };
  return { mode, dailyDate, engine: engine === ENGINE_VERSION ? "current" : { version: engine } };
}

export type Conflict = "daily" | "token" | "fingerprint";

const CONFLICTS = new Map<string, Conflict>([
  ["leaderboard_entries_daily_nickname_uq", "daily"],
  ["leaderboard_entries_fingerprint_uq", "fingerprint"],
]);

export type InsertResult =
  | { readonly ok: true; readonly row: LeaderboardRow; readonly rank: number }
  | { readonly ok: false; readonly conflict: Conflict };

export type SubmissionAdmission =
  | { readonly kind: "retry"; readonly row: LeaderboardRow }
  | { readonly kind: "limited" }
  | { readonly kind: "conflict"; readonly conflict: Conflict; readonly nickname: string | null }
  | { readonly kind: "admitted" };

export interface LeaderboardStore {
  admitSubmission(
    token: string,
    nickname: string,
    board: Board,
    keyHash: string,
    now: Date,
    rule: RateLimitRule,
  ): Promise<SubmissionAdmission>;
  /** The row that already holds this run: the same token, or the same fingerprint on the mode. */
  listedRun(token: string, mode: BoardMode, runFingerprint: string): Promise<LeaderboardRow | null>;
  /** Saves the row and ranks it in one coach view of its board, in a single statement. */
  insert(row: NewLeaderboardRow, coach: CoachFilter): Promise<InsertResult>;
  /** The row's rank in one coach view of its board, counted the way `top` orders that view. */
  rankOf(row: LeaderboardRow, board: Board, coach: CoachFilter): Promise<number>;
  /** The top `BOARD_LIMIT` rows of one coach view, in board order; ranks are 1..n in the view. */
  top(board: Board, coach: CoachFilter): Promise<readonly LeaderboardRow[]>;
  /** The top `SEED_BOARD_LIMIT` rows played on one seed of one mode, every engine and date. */
  seedBoard(mode: BoardMode, seed: string): Promise<readonly LeaderboardRow[]>;
}

const t = leaderboardEntries;

function coachFilter(coach: CoachFilter): SQL | undefined {
  return coach === "all" ? undefined : eq(t.coached, coach === "coached");
}

function boardFilter(board: Board): SQL {
  if (board.dailyDate !== null) {
    return and(eq(t.mode, board.mode), eq(t.dailyDate, board.dailyDate))!;
  }
  if (board.engine === "all") return eq(t.mode, board.mode);
  const engine = board.engine === "current" ? ENGINE_VERSION : board.engine.version;
  return and(eq(t.mode, board.mode), eq(t.engineVersion, engine))!;
}

const ORDER = [desc(t.wins), desc(t.draws), desc(t.teamScore), asc(t.createdAt), asc(t.id)];

type RankKey = {
  readonly [K in "wins" | "draws" | "teamScore" | "createdAt" | "id"]: LeaderboardRow[K] | SQL;
};

function aheadOf(row: RankKey): SQL {
  return or(
    gt(t.wins, row.wins),
    and(eq(t.wins, row.wins), gt(t.draws, row.draws)),
    and(eq(t.wins, row.wins), eq(t.draws, row.draws), gt(t.teamScore, row.teamScore)),
    and(
      eq(t.wins, row.wins),
      eq(t.draws, row.draws),
      eq(t.teamScore, row.teamScore),
      or(lt(t.createdAt, row.createdAt), and(eq(t.createdAt, row.createdAt), lt(t.id, row.id))),
    ),
  )!;
}

const INSERTED: RankKey = {
  wins: sql`inserted.wins`,
  draws: sql`inserted.draws`,
  teamScore: sql`inserted.team_score`,
  createdAt: sql`inserted.created_at`,
  id: sql`inserted.id`,
};

function rowFromJson(j: Record<string, unknown>): LeaderboardRow {
  return {
    id: j.id as string,
    nickname: j.nickname as string,
    mode: j.mode as LeaderboardRow["mode"],
    variant: j.variant as string,
    dailyDate: j.daily_date as string | null,
    seed: j.seed as string,
    token: j.token as string,
    teamScore: j.team_score as number,
    wins: j.wins as number,
    draws: j.draws as number,
    losses: j.losses as number,
    engineVersion: j.engine_version as string,
    coached: j.coached as boolean,
    runFingerprint: j.run_fingerprint as string,
    ipHash: j.ip_hash as string,
    createdAt: new Date(j.created_at as string),
  };
}

function uniqueViolation(e: unknown): string | null {
  for (let cur: unknown = e; cur instanceof Error || (typeof cur === "object" && cur !== null);) {
    const c = cur as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (c.code === "23505") return typeof c.constraint === "string" ? c.constraint : "";
    cur = c.cause;
  }
  return null;
}

export function drizzleStore(getDb: () => Db): LeaderboardStore {
  return {
    async admitSubmission(token, nickname, board, keyHash, now, rule) {
      // A retry or a conflict is answered without spending an attempt, so only a run that goes on
      // to the replay is counted.
      const dailyTaken =
        board.dailyDate === null
          ? sql`false`
          : sql`EXISTS(SELECT 1 FROM ${t} WHERE nickname = ${nickname}
              AND mode = ${board.mode} AND daily_date = ${board.dailyDate}::date)`;
      const result = await getDb().execute(sql`
        WITH existing AS MATERIALIZED (
          SELECT * FROM ${t}
          WHERE md5(token) = md5(${token}) AND token = ${token}
          LIMIT 1
        ), ${admissionCtes("submit", keyHash, now, rule, sql`NOT EXISTS (SELECT 1 FROM existing) AND NOT ${dailyTaken}`)}
        SELECT
          (SELECT row_to_json(existing) FROM existing) AS existing,
          EXISTS(SELECT 1 FROM admitted) AS allowed,
          ${dailyTaken} AS daily_taken
      `);
      const [out] = (
        result as unknown as {
          rows: {
            existing: Record<string, unknown> | null;
            allowed: boolean;
            daily_taken: boolean;
          }[];
        }
      ).rows;
      const existing = out!.existing;
      if (existing?.nickname === nickname) return { kind: "retry", row: rowFromJson(existing) };
      if (existing) {
        return { kind: "conflict", conflict: "token", nickname: existing.nickname as string };
      }
      if (out!.daily_taken) return { kind: "conflict", conflict: "daily", nickname: null };
      if (!out!.allowed) return { kind: "limited" };
      return { kind: "admitted" };
    },
    async listedRun(token, mode, runFingerprint) {
      const [row] = await getDb()
        .select()
        .from(t)
        .where(
          or(
            and(sql`md5(${t.token}) = md5(${token})`, eq(t.token, token)),
            and(eq(t.mode, mode), eq(t.runFingerprint, runFingerprint)),
          ),
        )
        .limit(1);
      return row ?? null;
    },
    async insert(row, coach) {
      const board = rankedBoard(row.mode, row.dailyDate ?? null, row.engineVersion);
      try {
        const db = getDb();
        // The outer query reads the table as it was before the insert, and a row is never ahead
        // of itself, so the count is exactly the rows that outrank the new one.
        const result = await db.execute(sql`
          WITH inserted AS ${db.insert(t).values(row).returning()}
          SELECT
            row_to_json(inserted) AS row,
            (SELECT count(*) FROM ${t}
              WHERE ${and(boardFilter(board), coachFilter(coach), aheadOf(INSERTED))})::int + 1 AS rank
          FROM inserted
        `);
        const [out] = (
          result as unknown as { rows: { row: Record<string, unknown>; rank: number }[] }
        ).rows;
        return { ok: true, row: rowFromJson(out!.row), rank: out!.rank };
      } catch (e) {
        const constraint = uniqueViolation(e);
        if (constraint === null) throw e;
        return { ok: false, conflict: CONFLICTS.get(constraint) ?? "token" };
      }
    },
    async rankOf(row, board, coach) {
      const [r] = await getDb()
        .select({ n: count() })
        .from(t)
        .where(and(boardFilter(board), coachFilter(coach), aheadOf(row)));
      return (r?.n ?? 0) + 1;
    },
    async top(board, coach) {
      return getDb()
        .select()
        .from(t)
        .where(and(boardFilter(board), coachFilter(coach)))
        .orderBy(...ORDER)
        .limit(BOARD_LIMIT);
    },
    // No index serves the seed filter. Under 10,000 rows the scan is sub-millisecond; past that,
    // add (mode, seed) to an index.
    async seedBoard(mode, seed) {
      return getDb()
        .select()
        .from(t)
        .where(and(eq(t.mode, mode), eq(t.seed, seed)))
        .orderBy(...ORDER)
        .limit(SEED_BOARD_LIMIT);
    },
  };
}

export function toBoardEntry<R extends number | null>(
  row: LeaderboardRow,
  rank: R,
): Omit<BoardEntry, "rank"> & { readonly rank: R } {
  const run = readAnyToken(row.token);
  return {
    rank,
    squadSpeciesIds: run === null ? undefined : squadOf(run),
    coached: row.coached,
    engineVersion: row.engineVersion,
    seed: row.seed,
    formation: run?.settings.formation ?? null,
    nickname: row.nickname,
    mode: row.mode,
    variant: row.variant,
    dailyDate: row.dailyDate,
    token: row.token,
    teamScore: row.teamScore,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    createdAt: row.createdAt.toISOString(),
  };
}
