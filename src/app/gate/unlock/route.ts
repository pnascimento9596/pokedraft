import type { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { handleUnlock } from "@/gate/unlock";
import { drizzleLimiter } from "@/ratelimit/store";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleUnlock(request, {
    limiter: drizzleLimiter(getDb),
    now: () => new Date(),
    passcode: process.env.FRIENDS_PASSCODE,
    ipHashSecret: process.env.IP_HASH_SECRET,
  });
}
