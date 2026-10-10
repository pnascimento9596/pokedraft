"use client";

import { useSyncExternalStore } from "react";
import type { IsoDate } from "@/engine";
import { dailyDate } from "@/leaderboard/daily";

function subscribe(): () => void {
  return () => {};
}

// Today's daily date is read on the client only, so the prerendered shell never bakes in a date.
export function useToday(): IsoDate | null {
  return useSyncExternalStore(
    subscribe,
    () => dailyDate(new Date()),
    () => null,
  );
}
