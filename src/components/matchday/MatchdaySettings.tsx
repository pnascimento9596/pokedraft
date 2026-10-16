"use client";

import { useId, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_PANEL,
  MANAGER_MODE_HINT,
  MANAGER_MODE_LABEL,
  MATCH_VIEWS,
  MATCH_VIEW_LABEL,
  loadPanel,
  savePanel,
  type MatchView,
} from "@/ui/settings";
import s from "./MatchdaySettings.module.css";

function subscribe(): () => void {
  return () => {};
}

// A primitive snapshot, so the store read stays stable between renders.
function stored(): string {
  const p = loadPanel();
  return `${p.managerMode ? "1" : "0"}|${p.matchView}`;
}

/**
 * Manager mode and the match view on a challenge's start screen. They are the same two settings
 * the home panel holds; changing them here saves them there too.
 */
export function MatchdaySettings() {
  const labelId = useId();
  const snapshot = useSyncExternalStore(subscribe, stored, () => null);
  const [local, setLocal] = useState<{ managerMode: boolean; matchView: MatchView } | null>(null);
  // The server and the first client render draw the defaults, so nothing moves once the stored
  // choice is read: only the switch and the pressed segment change.
  const [mm, mv] = (
    snapshot ?? `${DEFAULT_PANEL.managerMode ? "1" : "0"}|${DEFAULT_PANEL.matchView}`
  ).split("|") as [string, MatchView];
  const value = local ?? { managerMode: mm === "1", matchView: mv };
  const set = (patch: Partial<typeof value>) => {
    const next = { ...value, ...patch };
    savePanel({ ...loadPanel(), ...next });
    setLocal(next);
  };
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
        <div className={s.segmented} role="group" aria-labelledby={labelId}>
          {MATCH_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={s.segment}
              aria-pressed={value.matchView === v}
              data-testid={`match-view-${v}`}
              onClick={() => set({ matchView: v })}
            >
              {MATCH_VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
