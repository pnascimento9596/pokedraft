"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { IsoDate } from "@/engine";
import { BOARD_LIMIT, BOARD_MODES, BOARD_SCOPES, type BoardScope } from "@/leaderboard/contract";
import { MODE_LABEL } from "@/ui/labels";
import { Board } from "./Board";
import { boardHref, parseBoardView, type BoardView } from "./client";
import { longDate } from "./format";
import { useToday } from "./useToday";
import s from "./LeaderboardScreen.module.css";

const SCOPE_LABEL: Readonly<Record<BoardScope, string>> = { daily: "Daily", all: "All-time" };

export function LeaderboardScreen({ serverToday }: { readonly serverToday?: IsoDate }) {
  const today = useToday(serverToday ?? null);
  const params = useSearchParams();
  const router = useRouter();

  if (today === null) return <p className="kicker">Loading the board</p>;

  const view = parseBoardView(new URLSearchParams(params.toString()), today);
  const go = (next: Partial<BoardView>) => {
    router.replace(boardHref({ ...view, ...next }), { scroll: false });
  };

  return (
    <div className={s.screen}>
      <div className={s.controls}>
        <div role="tablist" aria-label="Board" className={s.tabs}>
          {BOARD_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              role="tab"
              className={s.tab}
              aria-selected={view.scope === scope}
              onClick={() => go({ scope })}
            >
              {SCOPE_LABEL[scope]}
            </button>
          ))}
        </div>
        {view.scope === "all" ? (
          <div className={s.modes} role="radiogroup" aria-label="Mode">
            {BOARD_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                className="chip"
                aria-checked={view.mode === mode}
                onClick={() => go({ mode })}
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        ) : null}
        {view.scope === "daily" ? (
          <label className={s.date}>
            <span className="kicker">Date</span>
            <input
              type="date"
              value={view.date}
              max={today}
              onChange={(e) => {
                if (e.target.value) go({ date: e.target.value });
              }}
            />
          </label>
        ) : null}
      </div>
      <p className={s.caption}>
        {view.scope === "daily"
          ? `Daily ${MODE_LABEL.cup8} for ${longDate(view.date)}${view.date === today ? " (today)" : ""}.`
          : `${MODE_LABEL[view.mode]}, all-time.`}{" "}
        Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top{" "}
        {BOARD_LIMIT}.
      </p>
      <Board view={view} />
    </div>
  );
}
