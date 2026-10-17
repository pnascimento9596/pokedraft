"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { Challenge } from "@/components/run/PlayScreen";
import { useToday } from "@/components/leaderboard/useToday";
import { dailySeed } from "@/engine/rng";
import { decodeToken } from "@/engine/token";
import { FORMATION_IDS, type FormationId, type IsoDate } from "@/engine/types";
import { dailySettings, isDailySettings } from "@/leaderboard/daily";
import { loadPanel } from "@/ui/settings";
import { readRunCheckpoint, readSession, RUN_CLEARED, runSlotKey } from "@/ui/storage";
import s from "./DailyScreen.module.css";

const savedSchema = z.object({
  screen: z.enum(["draft", "results", "matchday"]),
  token: z.string(),
  daily: z.string().nullable(),
});

function subscribe(): () => void {
  return () => {};
}

function initialFormation(today: IsoDate | null): FormationId | null {
  if (today === null) return null;
  const fallback = loadPanel().formation;
  const slot = { settings: dailySettings(fallback), seed: dailySeed(today), daily: today };
  const session = readSession(runSlotKey(slot));
  if (session === RUN_CLEARED) return fallback;
  // Match restoreRun's tab-first priority, but only decode settings here. Replay stays lazy.
  for (const raw of [session, readRunCheckpoint(slot)]) {
    if (raw === null) continue;
    let saved: z.infer<typeof savedSchema>;
    try {
      saved = savedSchema.parse(JSON.parse(raw));
    } catch {
      continue;
    }
    if (saved.daily !== today) return fallback;
    try {
      const { settings, seed } = decodeToken(saved.token);
      return seed === slot.seed && isDailySettings(settings) ? settings.formation : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function DailyScreen() {
  const today = useToday();
  const formationId = useId();
  const [selected, setSelected] = useState<FormationId | null>(null);
  const initial = useSyncExternalStore(
    subscribe,
    () => initialFormation(today),
    () => null,
  );
  const formation = selected ?? initial;
  if (today === null || formation === null) {
    return <p className="kicker page-loading">Loading the daily challenge</p>;
  }
  return (
    <Challenge
      key={`${today}|${formation}`}
      settings={dailySettings(formation)}
      querySeed={null}
      daily={today}
      renderSetup={(loading) => (
        <div className={s.formation}>
          <label htmlFor={formationId}>Formation</label>
          <select
            id={formationId}
            value={formation}
            disabled={loading}
            onChange={(e) => setSelected(e.target.value as FormationId)}
            aria-describedby={`${formationId}-hint`}
          >
            {FORMATION_IDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p id={`${formationId}-hint`}>
            Pick your shape before starting. Today&apos;s seed stays the same.
          </p>
        </div>
      )}
    />
  );
}
