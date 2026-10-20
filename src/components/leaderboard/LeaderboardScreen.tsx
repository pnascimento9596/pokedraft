"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { IsoDate } from "@/engine";
import { ENGINE_VERSION } from "@/engine/types";
import { engineLabel } from "@/engine/versions/label";
import { BOARD_LIMIT, BOARD_MODES, BOARD_SCOPES, type BoardScope } from "@/leaderboard/contract";
import { MODE_LABEL } from "@/ui/labels";
import { ModuleCard } from "@/components/ui/primitives";
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
  const dateLabelId = useId();
  const [dateFontReady, setDateFontReady] = useState(false);

  useEffect(() => {
    let active = true;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (active) setDateFontReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (today === null) return <p className="kicker">Loading the board</p>;

  const view = parseBoardView(new URLSearchParams(params.toString()), today);
  const go = (next: Partial<BoardView>) => {
    router.replace(boardHref({ ...view, ...next }), { scroll: false });
  };

  const engines = view.engine === "all" ? "every engine" : `engine ${engineLabel(ENGINE_VERSION)}`;
  const caption = `${
    view.scope === "daily"
      ? `Daily ${MODE_LABEL.cup8} for ${longDate(view.date)}${view.date === today ? " (today)" : ""}.`
      : `${MODE_LABEL[view.mode]}, all-time, ${engines}. Every draft setting shares this board, and each row names its settings.`
  } Ranked by wins, then draws, then Team Score. Ties go to the earlier submission. Top ${BOARD_LIMIT}.`;

  return (
    <ModuleCard
      className={s.screen}
      eyebrow={view.scope === "daily" ? "Daily board" : "All-time board"}
      title="Completed runs"
      description="Choose a board, then open a run to see its squad."
    >
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
            <span id={dateLabelId} className="kicker">
              Date
            </span>
            <span className={s.dateField} data-font-ready={dateFontReady}>
              <span className={s.dateLoading} aria-hidden="true">
                Loading date
              </span>
              <input
                type="date"
                aria-labelledby={dateLabelId}
                value={view.date}
                max={today}
                onChange={(e) => {
                  if (e.target.value) go({ date: e.target.value });
                }}
              />
            </span>
          </label>
        ) : null}
      </div>
      <p className={s.caption}>{caption}</p>
      <Board
        view={view}
        onCoachChange={(coach) => go({ coach })}
        onEngineChange={(engine) => go({ engine })}
      />
    </ModuleCard>
  );
}
