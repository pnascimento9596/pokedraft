"use client";

import { useSyncExternalStore } from "react";
import type { IsoDate } from "@/engine";
import { dailyDate } from "@/leaderboard/daily";

function subscribe(): () => void {
  return () => {};
}

// Today's daily date is read on the client, so a prerendered shell never bakes in a date. A page
// rendered at request time can pass the server's date, which is then what hydration starts from.
export function useToday(serverToday: IsoDate | null = null): IsoDate | null {
  return useSyncExternalStore(
    subscribe,
    () => dailyDate(new Date()),
    () => serverToday,
  );
}
