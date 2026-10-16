import { and, asc, count, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { leaderboardEntries, type LeaderboardRow, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { admissionCtes, type RateLimitRule } from "@/ratelimit/store";
import { squadPreview } from "./squad-preview";
import { BOARD_LIMIT, type BoardEntry, type BoardMode } from "../contract";

export type Board = { readonly mode: BoardMode; readonly dailyDate: string | null };

export type Conflict = "daily" | "token";

export type InsertResult =
  | { readonly ok: true; readonly row: LeaderboardRow }
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
  insert(row: NewLeaderboardRow): Promise<InsertResult>;
  rankOf(row: LeaderboardRow, board: Board): Promise<number>;
  top(board: Board): Promise<readonly LeaderboardRow[]>;
}

const t = leaderboardEntries;

function boardFilter(board: Board): SQL {
  return board.dailyDate === null
    ? eq(t.mode, board.mode)
    : and(eq(t.mode, board.mode), eq(t.dailyDate, board.dailyDate))!;
}

const ORDER = [desc(t.wins), desc(t.draws), desc(t.teamScore), asc(t.createdAt), asc(t.id)];

function aheadOf(row: LeaderboardRow): SQL {
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
      if (existing?.nickname === nickname) {
        const row: LeaderboardRow = {
          id: existing.id as string,
          nickname: existing.nickname as string,
          mode: existing.mode as LeaderboardRow["mode"],
          variant: existing.variant as string,
          dailyDate: existing.daily_date as string | null,
          seed: existing.seed as string,
          token: existing.token as string,
          teamScore: existing.team_score as number,
          wins: existing.wins as number,
          draws: existing.draws as number,
          losses: existing.losses as number,
          engineVersion: existing.engine_version as string,
          ipHash: existing.ip_hash as string,
          createdAt: new Date(existing.created_at as string),
        };
        return { kind: "retry", row };
      }
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
    async insert(row) {
      try {
        const [inserted] = await getDb().insert(t).values(row).returning();
        return { ok: true, row: inserted! };
      } catch (e) {
        const constraint = uniqueViolation(e);
        if (constraint === null) throw e;
        return {
          ok: false,
          conflict: constraint === "leaderboard_entries_daily_nickname_uq" ? "daily" : "token",
        };
      }
    },
    async rankOf(row, board) {
      const [r] = await getDb()
        .select({ n: count() })
        .from(t)
        .where(and(boardFilter(board), aheadOf(row)));
      return (r?.n ?? 0) + 1;
    },
    async top(board) {
      return getDb()
        .select()
        .from(t)
        .where(boardFilter(board))
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
