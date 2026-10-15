import { sql, type SQL } from "drizzle-orm";
import { rateLimitBuckets, rateLimitEvents } from "@/db/schema";
import type { Db } from "@/db/types";

export type RateLimitScope = "submit" | "gate";

export interface RateLimitRule {
  readonly max: number;
  readonly windowMs: number;
}

export interface RateLimiter {
  consume(scope: RateLimitScope, keyHash: string, now: Date, rule: RateLimitRule): Promise<boolean>;
}

// ON CONFLICT locks the one shared bucket and rechecks its latest attempts. A count followed by
// an insert, even with an advisory lock in the statement, can use a stale statement snapshot.
export function admissionCtes(
  scope: RateLimitScope,
  keyHash: string,
  now: Date,
  rule: RateLimitRule,
  needed: SQL = sql`true`,
): SQL {
  const since = new Date(now.getTime() - rule.windowMs).toISOString();
  const at = now.toISOString();
  const buckets = rateLimitBuckets;
  const active = sql`ARRAY(SELECT attempt FROM unnest(${buckets.attempts}) AS attempt
    WHERE attempt >= ${since}::timestamptz)`;
  return sql`
    admitted AS (
      INSERT INTO ${buckets} (scope, key_hash, attempts)
      SELECT ${scope}, ${keyHash}, history.attempts || ARRAY[${at}::timestamptz]
      FROM (
        SELECT coalesce(array_agg(created_at), ARRAY[]::timestamptz[]) AS attempts
        FROM ${rateLimitEvents}
        WHERE scope = ${scope} AND key_hash = ${keyHash}
          AND created_at >= ${since}::timestamptz
      ) history
      WHERE ${needed} AND cardinality(history.attempts) < ${rule.max}
      ON CONFLICT (scope, key_hash) DO UPDATE
      SET attempts = ${active} || ARRAY[${at}::timestamptz]
      WHERE cardinality(${active}) < ${rule.max}
      RETURNING scope, key_hash
    ), recorded AS (
      INSERT INTO ${rateLimitEvents} (scope, key_hash, created_at)
      SELECT scope, key_hash, ${at}::timestamptz FROM admitted
      RETURNING id
    )
  `;
}

export function drizzleLimiter(getDb: () => Db): RateLimiter {
  return {
    async consume(scope, keyHash, now, rule) {
      const result = await getDb().execute(sql`
        WITH ${admissionCtes(scope, keyHash, now, rule)}
        SELECT EXISTS(SELECT 1 FROM admitted) AS allowed
      `);
      return (result as unknown as { rows: { allowed: boolean }[] }).rows[0]!.allowed;
    },
  };
}
