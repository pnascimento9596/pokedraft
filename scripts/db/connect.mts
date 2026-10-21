import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export interface SqlQuery extends Promise<Record<string, unknown>[]> {
  readonly text: string;
  readonly params: unknown[];
}

export interface SqlClient {
  query(text: string, params?: unknown[]): SqlQuery;
  transaction(queries: SqlQuery[]): Promise<Record<string, unknown>[][]>;
}

export interface PgPoolLike {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  connect(): Promise<{
    query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
    release(): void;
  }>;
}

export function createPgSql(pool: PgPoolLike): SqlClient {
  return {
    query(text: string, params: unknown[] = []): SqlQuery {
      let pending: Promise<Record<string, unknown>[]> | null = null;
      const start = () => {
        if (!pending) {
          pending = pool.query(text, params).then((res) => res.rows as Record<string, unknown>[]);
        }
        return pending;
      };
      return {
        text,
        params,
        [Symbol.toStringTag]: "Promise",
        then(onfulfilled, onrejected) {
          return start().then(onfulfilled, onrejected);
        },
        catch(onrejected) {
          return start().catch(onrejected);
        },
        finally(onfinally) {
          return start().finally(onfinally);
        },
      };
    },
    async transaction(queries: SqlQuery[]): Promise<Record<string, unknown>[][]> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results: Record<string, unknown>[][] = [];
        for (const q of queries) {
          const res = await client.query(q.text, q.params);
          results.push(res.rows as Record<string, unknown>[]);
        }
        await client.query("COMMIT");
        return results;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

export function connect(): {
  sql: SqlClient;
  host: string;
  migrate: (config: { migrationsFolder: string }) => Promise<void>;
} {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL. Never print its value.");
  const host = new URL(url).hostname;
  if (process.env.DB_DRIVER === "pg") {
    const pool = new pg.Pool({ connectionString: url, allowExitOnIdle: true });
    return {
      sql: createPgSql(pool),
      host,
      migrate: (config) => migratePg(drizzlePg(pool), config),
    };
  }
  const sql = neon(url);
  return {
    sql: sql as unknown as SqlClient,
    host,
    migrate: (config) => migrateNeon(drizzleNeon(sql), config),
  };
}
