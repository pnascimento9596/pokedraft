"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Challenge } from "@/components/run/PlayScreen";
import { useToday } from "@/components/leaderboard/useToday";
import { dailySeed } from "@/engine/rng";
import { decodeToken } from "@/engine/token";
import { FORMATION_IDS, type FormationId, type IsoDate } from "@/engine/types";
import { dailySettings, isDailySettings } from "@/leaderboard/daily";
import { DEFAULT_PANEL, loadPanel } from "@/ui/settings";
import { readRunCheckpoint, readSession, RUN_CLEARED, runSlotKey } from "@/ui/storage";
import { parseDailySaved } from "./dailySaved";
import s from "./DailyScreen.module.css";

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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const saved = parseDailySaved(parsed);
    if (saved === null) continue;
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

export function DailyScreen({
  serverToday = null,
}: {
  readonly serverToday?: IsoDate | null;
} = {}) {
  const today = useToday(serverToday);
  const formationId = useId();
  const [selected, setSelected] = useState<FormationId | null>(null);
  const initial = useSyncExternalStore(
    subscribe,
    () => initialFormation(today),
    () => (serverToday !== null ? DEFAULT_PANEL.formation : null),
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
