import { and, asc, count, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { leaderboardEntries, type LeaderboardRow, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { admissionCtes, type RateLimitRule } from "@/ratelimit/store";
import { isCoached, MANAGER_TOKEN_VERSIONS } from "@/ui/manager/coached";
import { squadPreview } from "./squad-preview";
import { BOARD_LIMIT, type BoardEntry, type BoardMode, type CoachFilter } from "../contract";

export type Board = { readonly mode: BoardMode; readonly dailyDate: string | null };

export type Conflict = "daily" | "token";

export type InsertResult =
  | { readonly ok: true; readonly row: LeaderboardRow; readonly rank: number }
  | { readonly ok: false; readonly conflict: Conflict };

export type SubmissionAdmission =
  | { readonly kind: "retry"; readonly row: LeaderboardRow }
  | { readonly kind: "limited" }
  | { readonly kind: "conflict"; readonly conflict: Conflict }
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
  byToken(token: string): Promise<LeaderboardRow | null>;
  dailyTaken(nickname: string, board: Board): Promise<boolean>;
  /** Saves the row and ranks it in one coach view of its board, in a single statement. */
  insert(row: NewLeaderboardRow, coach: CoachFilter): Promise<InsertResult>;
  /** The row's rank in one coach view of its board, counted the way `top` orders that view. */
  rankOf(row: LeaderboardRow, board: Board, coach: CoachFilter): Promise<number>;
  /** The top `BOARD_LIMIT` rows of one coach view, in board order; ranks are 1..n in the view. */
  top(board: Board, coach: CoachFilter): Promise<readonly LeaderboardRow[]>;
}

const t = leaderboardEntries;

/**
 * `isCoached` in SQL: for a token of a version in `MANAGER_TOKEN_VERSIONS`, base64url-decode the
 * payload after the `pd<v>.` prefix and test that the JSON array has more than three elements.
 * Every other token is uncoached. The expression is total, so a hand-edited row reads uncoached
 * instead of failing the whole board query. Only a token in the base64url alphabet whose body
 * length is not 1 mod 4 reaches `decode`. The bytes are read as LATIN1, which never fails except
 * on a NUL byte, so invalid UTF-8 is tolerated the way `TextDecoder` replaces it, and
 * `pg_input_is_valid` (PostgreSQL 16 and later) screens the JSON before the cast. CASE fixes the
 * evaluation order that AND does not. The only spliced text is the versions, which must be
 * positive integers.
 */
export function coachedSqlFor(versions: readonly number[]): SQL<boolean> {
  for (const v of versions) {
    if (!Number.isSafeInteger(v) || v <= 0) {
      throw new Error(`coachedSql token versions must be positive integers, got ${String(v)}`);
    }
  }
  return sql<boolean>`(CASE ${sql.join(
    versions.map((v) => {
      const n = `pd${v}.`.length;
      const bytes = sql`decode(rpad(translate(substr(${t.token}, ${sql.raw(String(n + 1))}), '-_', '+/'), ((length(${t.token}) - ${sql.raw(String(n))} + 3) / 4) * 4, '='), 'base64')`;
      const text = sql`convert_from(${bytes}, 'LATIN1')`;
      return sql`WHEN ${t.token} ~ ${sql.raw(`'^pd${v}\\.[A-Za-z0-9_-]+$'`)} AND (length(${t.token}) - ${sql.raw(String(n))}) % 4 <> 1 THEN (CASE WHEN position('\\x00'::bytea IN ${bytes}) > 0 THEN false WHEN NOT pg_input_is_valid(${text}, 'jsonb') THEN false WHEN jsonb_typeof(${text}::jsonb) <> 'array' THEN false ELSE jsonb_array_length(${text}::jsonb) > 3 END)`;
    }),
    sql.raw(" "),
  )} ELSE false END)`;
}

export const coachedSql: SQL<boolean> = coachedSqlFor(MANAGER_TOKEN_VERSIONS);

function coachFilter(coach: CoachFilter): SQL | undefined {
  if (coach === "coached") return coachedSql;
  if (coach === "uncoached") return sql`NOT ${coachedSql}`;
  return undefined;
}

function boardFilter(board: Board): SQL {
  return board.dailyDate === null
    ? eq(t.mode, board.mode)
    : and(eq(t.mode, board.mode), eq(t.dailyDate, board.dailyDate))!;
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
    coached: j.coached as boolean | null,
    runFingerprint: j.run_fingerprint as string | null,
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
      const dailyTaken = sql`EXISTS(SELECT 1 FROM ${t} WHERE nickname = ${nickname}
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
      if (existing) return { kind: "conflict", conflict: "token" };
      if (out!.daily_taken) return { kind: "conflict", conflict: "daily" };
      if (!out!.allowed) return { kind: "limited" };
      return { kind: "admitted" };
    },
    async byToken(token) {
      const [row] = await getDb()
        .select()
        .from(t)
        .where(and(sql`md5(${t.token}) = md5(${token})`, eq(t.token, token)))
        .limit(1);
      return row ?? null;
    },
    async dailyTaken(nickname, board) {
      if (board.dailyDate === null) return false;
      const hit = await getDb()
        .select({ id: t.id })
        .from(t)
        .where(and(eq(t.nickname, nickname), boardFilter(board)))
        .limit(1);
      return hit.length > 0;
    },
    async insert(row, coach) {
      const board: Board = { mode: row.mode, dailyDate: row.dailyDate ?? null };
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
        return {
          ok: false,
          conflict: constraint === "leaderboard_entries_daily_nickname_uq" ? "daily" : "token",
        };
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
  };
}

export function toBoardEntry<R extends number | null>(
  row: LeaderboardRow,
  rank: R,
): Omit<BoardEntry, "rank"> & { readonly rank: R } {
  return {
    rank,
    squadSpeciesIds: squadPreview(row.token),
    coached: isCoached(row.token),
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
