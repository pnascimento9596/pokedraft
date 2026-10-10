import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nickname: text("nickname").notNull(),
    mode: text("mode", { enum: ["cup8", "kanto151"] }).notNull(),
    variant: text("variant").notNull(),
    dailyDate: date("daily_date", { mode: "string" }),
    seed: text("seed").notNull(),
    token: text("token").notNull(),
    teamScore: integer("team_score").notNull(),
    wins: integer("wins").notNull(),
    draws: integer("draws").notNull(),
    losses: integer("losses").notNull(),
    engineVersion: text("engine_version").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("leaderboard_entries_daily_nickname_uq")
      .on(t.nickname, t.mode, t.dailyDate)
      .where(sql`${t.dailyDate} IS NOT NULL`),
    uniqueIndex("leaderboard_entries_token_uq").on(sql`md5(${t.token})`),
    index("leaderboard_entries_board_idx").on(
      t.mode,
      t.dailyDate,
      t.wins.desc(),
      t.draws.desc(),
      t.teamScore.desc(),
      t.createdAt,
    ),
    index("leaderboard_entries_ip_recent_idx").on(t.ipHash, t.createdAt),
    check("leaderboard_entries_mode_chk", sql`${t.mode} IN ('cup8', 'kanto151')`),
    check(
      "leaderboard_entries_nickname_chk",
      sql`char_length(${t.nickname}) BETWEEN 2 AND 20 AND ${t.nickname} = btrim(${t.nickname})`,
    ),
    check("leaderboard_entries_daily_mode_chk", sql`${t.dailyDate} IS NULL OR ${t.mode} = 'cup8'`),
    check(
      "leaderboard_entries_record_chk",
      sql`${t.wins} >= 0 AND ${t.draws} >= 0 AND ${t.losses} >= 0`,
    ),
  ],
);

export type LeaderboardRow = typeof leaderboardEntries.$inferSelect;
export type NewLeaderboardRow = typeof leaderboardEntries.$inferInsert;

// One row per throttled request (submit or gate attempt), whatever its outcome. The key is the
// keyed IP hash, so no raw address is stored.
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: text("scope", { enum: ["submit", "gate"] }).notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("rate_limit_events_lookup_idx").on(t.scope, t.keyHash, t.createdAt),
    check("rate_limit_events_scope_chk", sql`${t.scope} IN ('submit', 'gate')`),
  ],
);
