import type { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { handleBoard, handleSubmit } from "@/leaderboard/server/handlers";
import { drizzleStore } from "@/leaderboard/server/store";
import { drizzleLimiter } from "@/ratelimit/store";

export function GET(req: NextRequest): Promise<Response> {
  return handleBoard(req.nextUrl, drizzleStore(getDb));
}

export function POST(req: NextRequest): Promise<Response> {
  return handleSubmit(req, {
    store: drizzleStore(getDb),
    limiter: drizzleLimiter(getDb),
    ipHashSecret: process.env.IP_HASH_SECRET,
    now: () => new Date(),
  });
}
