import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Db } from "./types";

const QUERY_TIMEOUT_MS = 4000;

// The driver spreads `fetchOptions` into every fetch it makes, so the getter hands each query a
// fresh timeout. A signal created once here would expire four seconds after the first query.
const fetchOptions = {
  get signal(): AbortSignal {
    return AbortSignal.timeout(QUERY_TIMEOUT_MS);
  },
};

let cached: Db | null = null;

export function getDb(): Db {
  if (cached !== null) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  cached = drizzle(neon(url, { fetchOptions }), { schema });
  return cached;
}
