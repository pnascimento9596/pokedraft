import { and, eq, lt, sql } from "drizzle-orm";
import { rateLimitEvents } from "@/db/schema";
import type { Db } from "@/db/types";

export type RateLimitScope = "submit" | "gate";

export interface RateLimitRule {
  readonly max: number;
  readonly windowMs: number;
}

export interface RateLimiter {
  // Records this attempt and returns true while the key is under the rule. A refused attempt is
  // not recorded, so a caller that keeps hammering cannot extend its own lockout.
  consume(scope: RateLimitScope, keyHash: string, now: Date, rule: RateLimitRule): Promise<boolean>;
}

const t = rateLimitEvents;

export function drizzleLimiter(getDb: () => Db): RateLimiter {
  return {
    async consume(scope, keyHash, now, rule) {
      const db = getDb();
      const since = new Date(now.getTime() - rule.windowMs);
      await db
        .delete(t)
        .where(and(eq(t.scope, scope), eq(t.keyHash, keyHash), lt(t.createdAt, since)));
      const inserted = await db.execute(sql`
        INSERT INTO ${t} (scope, key_hash, created_at)
        SELECT ${scope}, ${keyHash}, ${now.toISOString()}::timestamptz
        WHERE (
          SELECT count(*) FROM ${t}
          WHERE scope = ${scope} AND key_hash = ${keyHash} AND created_at >= ${since.toISOString()}::timestamptz
        ) < ${rule.max}
        RETURNING id
      `);
      return (inserted as unknown as { rows: unknown[] }).rows.length > 0;
    },
  };
}
