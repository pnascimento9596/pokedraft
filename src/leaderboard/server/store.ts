import { and, asc, count, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
import { leaderboardEntries, type LeaderboardRow, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { BOARD_LIMIT, type BoardEntry, type BoardMode } from "../contract";

export type Board = { readonly mode: BoardMode; readonly dailyDate: string | null };

export type Conflict = "daily" | "token";

export type InsertResult =
  | { readonly ok: true; readonly row: LeaderboardRow }
  | { readonly ok: false; readonly conflict: Conflict };

export interface LeaderboardStore {
  conflictFor(token: string, nickname: string, board: Board): Promise<Conflict | null>;
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
    async conflictFor(token, nickname, board) {
      const tokenHit = await getDb()
        .select({ id: t.id })
        .from(t)
        .where(sql`md5(${t.token}) = md5(${token})`)
        .limit(1);
      if (tokenHit.length > 0) return "token";
      if (board.dailyDate === null) return null;
      const dailyHit = await getDb()
        .select({ id: t.id })
        .from(t)
        .where(and(eq(t.nickname, nickname), boardFilter(board)))
        .limit(1);
      return dailyHit.length > 0 ? "daily" : null;
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
