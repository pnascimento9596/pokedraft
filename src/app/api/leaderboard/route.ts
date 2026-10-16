import type { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { handleBoard, handleSubmit } from "@/leaderboard/server/handlers";
import { drizzleStore } from "@/leaderboard/server/store";
import { requestIdOf } from "@/observability/log";

export function GET(req: NextRequest): Promise<Response> {
  return handleBoard(req.nextUrl, drizzleStore(getDb), requestIdOf(req.headers));
}

export function POST(req: NextRequest): Promise<Response> {
  return handleSubmit(req, {
    store: drizzleStore(getDb),
    ipHashSecret: process.env.IP_HASH_SECRET,
    now: () => new Date(),
  });
}
