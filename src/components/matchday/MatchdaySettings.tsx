"use client";

import { useId, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_PANEL,
  MANAGER_MODE_HINT,
  MANAGER_MODE_LABEL,
  MANAGER_PLAYS_LIVE,
  MATCH_VIEWS,
  MATCH_VIEW_LABEL,
  loadPanel,
  matchdayView,
  savePanel,
  type Matchday,
  type MatchView,
} from "@/ui/settings";
import s from "./MatchdaySettings.module.css";

// Another tab saving the panel fires a storage event here; this tab's own saves do not.
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// A primitive snapshot, so the store read stays stable between renders.
function stored(): string {
  const p = loadPanel();
  return `${p.managerMode ? "1" : "0"}|${p.matchView}`;
}

// The server and the first client render draw the defaults, so nothing moves once the stored
// choice is read: only the switch, the pressed segment and the summary line change.
const serverSnapshot = () => null;

/**
 * Manager mode and the match view as the stored home panel holds them, for a challenge's start
 * screen. A change saves the panel, so home shows it too.
 */
export function useStoredMatchday(): readonly [Matchday, (next: Matchday) => void] {
  const snapshot = useSyncExternalStore(subscribe, stored, serverSnapshot);
  // A choice made here holds only while the stored panel is the one it was made over, so it covers
  // blocked storage but gives way once another tab saves.
  const [local, setLocal] = useState<{ over: string | null; value: Matchday } | null>(null);
  const [mm, mv] = (
    snapshot ?? `${DEFAULT_PANEL.managerMode ? "1" : "0"}|${DEFAULT_PANEL.matchView}`
  ).split("|") as [string, MatchView];
  const value =
    local !== null && local.over === snapshot
      ? local.value
      : { managerMode: mm === "1", matchView: mv };
  const set = (next: Matchday) => {
    savePanel({ ...loadPanel(), ...next });
    setLocal({ over: stored(), value: next });
  };
  return [value, set];
}

/** The Matchday selector. Home binds it to its panel state, the start screen to `useStoredMatchday`. */
export function MatchdaySettings({
  value,
  onChange,
}: {
  readonly value: Matchday;
  readonly onChange: (next: Matchday) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const set = (patch: Partial<Matchday>) => onChange({ ...value, ...patch });
  const shown = matchdayView(value);
  return (
    <div className={s.settings} data-testid="matchday-settings">
      <button
        type="button"
        role="switch"
        aria-checked={value.managerMode}
        className={s.switch}
        data-testid="manager-mode"
        onClick={() => set({ managerMode: !value.managerMode })}
      >
        <span className={s.text}>
          <span className={s.label}>{MANAGER_MODE_LABEL}</span>
          <span className={s.hint}>{MANAGER_MODE_HINT}</span>
        </span>
        <span className={s.track} aria-hidden="true">
          <span className={s.thumb} />
        </span>
      </button>
      <div className={s.field}>
        <span className={s.label} id={labelId}>
          Match view
        </span>
        <div
          className={s.segmented}
          role="group"
          aria-labelledby={labelId}
          aria-describedby={value.managerMode ? hintId : undefined}
        >
          {MATCH_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={s.segment}
              aria-pressed={shown === v}
              disabled={value.managerMode && v === "quick"}
              data-testid={`match-view-${v}`}
              onClick={() => set({ matchView: v })}
            >
              {MATCH_VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        {value.managerMode ? (
          <span className={s.hint} id={hintId} data-testid="match-view-hint">
            {MANAGER_PLAYS_LIVE}
          </span>
        ) : null}
      </div>
    </div>
  );
}
