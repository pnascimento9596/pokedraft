import { sql, type SQL } from "drizzle-orm";
import { rateLimitBuckets, rateLimitEvents } from "@/db/schema";
import type { Db } from "@/db/types";

export type RateLimitScope = "submit";

export interface RateLimitRule {
  readonly max: number;
  readonly windowMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EVENT_RETENTION_MS = 7 * DAY_MS;
const BUCKET_IDLE_MS = DAY_MS;
const PRUNE_BATCH = 50;

export interface RateLimiter {
  consume(scope: RateLimitScope, keyHash: string, now: Date, rule: RateLimitRule): Promise<boolean>;
}

// ON CONFLICT locks the one shared bucket and rechecks its latest attempts. A count followed by
// an insert, even with an advisory lock in the statement, can use a stale statement snapshot.
// Pruning rides in the same statement. The bucket prune reads `admitted` so it starts only after
// this key's row lock is held, and SKIP LOCKED means it never waits, so two admissions cannot
// deadlock on each other's stale keys. Its condition uses only the row's own columns, so READ
// COMMITTED rechecks it against a concurrently refreshed bucket and skips that row.
export function admissionCtes(
  scope: RateLimitScope,
  keyHash: string,
  now: Date,
  rule: RateLimitRule,
  needed: SQL = sql`true`,
): SQL {
  if (rule.windowMs > BUCKET_IDLE_MS) {
    throw new RangeError(
      `rate-limit window ${rule.windowMs} ms exceeds bucket idle cutoff ${BUCKET_IDLE_MS} ms`,
    );
  }
  const since = new Date(now.getTime() - rule.windowMs).toISOString();
  const at = now.toISOString();
  const eventCutoff = new Date(now.getTime() - EVENT_RETENTION_MS).toISOString();
  const bucketCutoff = new Date(now.getTime() - BUCKET_IDLE_MS).toISOString();
  const buckets = rateLimitBuckets;
  const prunable = sql`NOT (scope = ${scope} AND key_hash = ${keyHash})
    AND (SELECT max(attempt) FROM unnest(attempts) AS attempt) < ${bucketCutoff}::timestamptz`;
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
    ), pruned_events AS (
      DELETE FROM ${rateLimitEvents}
      WHERE id IN (
        SELECT id FROM ${rateLimitEvents}
        WHERE created_at < ${eventCutoff}::timestamptz
        ORDER BY created_at
        LIMIT ${PRUNE_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    ), pruned_buckets AS (
      DELETE FROM ${buckets}
      WHERE (scope, key_hash) IN (
        SELECT scope, key_hash FROM ${buckets}
        WHERE ${prunable} AND (SELECT count(*) FROM admitted) >= 0
        ORDER BY scope, key_hash
        LIMIT ${PRUNE_BATCH}
        FOR UPDATE SKIP LOCKED
      ) AND ${prunable}
      RETURNING scope
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
