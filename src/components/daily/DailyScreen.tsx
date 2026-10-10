"use client";

import { useSyncExternalStore } from "react";
import { Challenge } from "@/components/run/PlayScreen";
import { useToday } from "@/components/leaderboard/useToday";
import { dailySettings } from "@/leaderboard/daily";
import { loadPanel } from "@/ui/settings";

function subscribe(): () => void {
  return () => {};
}

export function DailyScreen() {
  const today = useToday();
  const formation = useSyncExternalStore(
    subscribe,
    () => loadPanel().formation,
    () => null,
  );
  if (today === null || formation === null) {
    return <p className="kicker">Loading the daily challenge</p>;
  }
  return (
    <Challenge
      key={`${today}|${formation}`}
      settings={dailySettings(formation)}
      querySeed={null}
      daily={today}
    />
  );
}
