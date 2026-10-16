"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeToken,
  encodeToken,
  replay,
  type CupResult,
  type DraftSettings,
  type DraftState,
  type IsoDate,
  type ManagerAction,
} from "@/engine";
import { toFullLineup } from "@/engine/draft";
import { MatchdayFlow } from "@/components/matchday/MatchdayFlow";
import type { CupContext } from "@/ui/manager/touchline";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import { ResultsView } from "@/components/results/ResultsView";
import { focusHeading } from "@/ui/focus";
import { loadPanel, playHref, playsMatchday, type MatchView } from "@/ui/settings";
import { DraftBoard } from "./DraftBoard";
import { runToken, startRun, step, type Run } from "./runState";
import { forgetRun, saveRun, type Restored, type RunSlot } from "./savedRun";
import s from "./PlayScreen.module.css";

// The matchday is never saved on its own: a reload during it comes back to the finished draft.
type Screen =
  | Restored
  | {
      readonly kind: "matchday";
      readonly run: Run;
      readonly token: string;
      readonly draft: DraftState;
      readonly cup: CupResult;
      readonly ctx: CupContext;
      readonly view: MatchView;
      readonly managerMode: boolean;
    };
export { restoreRun } from "./savedRun";

// The draft and the results. PlayScreen loads this module (and the species data under it) with
// import() at Start, so the start panel's first load carries none of it.
export function LiveRun({
  settings,
  seed,
  daily,
  title,
  initial,
  onNewRun,
}: {
  readonly settings: DraftSettings;
  readonly seed: string;
  readonly daily?: IsoDate;
  readonly title: string;
  readonly initial: Restored | null;
  readonly onNewRun: () => void;
}) {
  const slot: RunSlot = { settings, seed, daily: daily ?? null };
  const [screen, setScreen] = useState<Screen>(
    () => initial ?? { kind: "draft", run: startRun(settings, seed) },
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [showRatings] = useState(() => loadPanel().showChallengeRatings);
  const unsavedStart = useRef(initial === null && screen.kind === "draft" ? screen.run : null);

  useEffect(() => {
    const run = unsavedStart.current;
    if (run === null) return;
    unsavedStart.current = null;
    saveRun({ settings, seed, daily: daily ?? null }, "draft", runToken(run));
  }, [settings, seed, daily]);

  // Start run, See results and New run each swap the screen; the new screen's heading takes focus.
  useEffect(() => {
    focusHeading();
  }, [screen.kind]);

  // Every screen change goes through here, so the tab always holds the run that is showing.
  const show = (next: Screen) => {
    if (next.kind === "draft") saveRun(slot, "draft", runToken(next.run));
    else if (next.kind === "results") saveRun(slot, "results", next.token);
    setScreen(next);
  };

  const seeResults = (run: Run) => {
    const token = runToken(run);
    try {
      const { draft, cup } = replay(token);
      const panel = loadPanel();
      // Builder runs are friendlies; the matchday belongs to the drafted cups.
      if (settings.mode !== "builder" && playsMatchday(panel)) {
        show({
          kind: "matchday",
          run,
          token,
          draft,
          cup,
          ctx: { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode },
          view: panel.matchView,
          managerMode: panel.managerMode,
        });
      } else {
        show({ kind: "results", token, draft, cup });
      }
      window.scrollTo({ top: 0 });
    } catch {
      setFailure("This run could not be scored. Start a new run.");
    }
  };

  const matchdayToken = screen.kind === "matchday" ? screen.token : null;
  const finishMatchday = useCallback(
    (manager: readonly ManagerAction[]) => {
      if (matchdayToken === null) return;
      try {
        const token = encodeToken({ ...decodeToken(matchdayToken), manager });
        const { draft, cup } = replay(token);
        saveRun({ settings, seed, daily: daily ?? null }, "results", token);
        setScreen({ kind: "results", token, draft, cup });
        window.scrollTo({ top: 0 });
      } catch {
        setFailure("This run could not be scored. Start a new run.");
      }
    },
    [matchdayToken, settings, seed, daily],
  );

  const newRun = () => {
    forgetRun(slot, {
      screen: screen.kind === "matchday" ? "draft" : screen.kind,
      token: screen.kind === "results" ? screen.token : runToken(screen.run),
    });
    onNewRun();
  };

  if (screen.kind === "matchday") {
    return (
      <MatchdayFlow
        ctx={screen.ctx}
        initialCup={screen.cup}
        view={screen.view}
        managerMode={screen.managerMode}
        onFinish={finishMatchday}
      />
    );
  }

  if (screen.kind === "results") {
    return (
      <ResultsView
        token={screen.token}
        draft={screen.draft}
        cup={screen.cup}
        variant="live"
        navFamily={daily === undefined ? "play" : "daily"}
        onNewRun={daily === undefined ? newRun : undefined}
        submit={
          settings.mode === "builder" ? undefined : (
            <>
              <SubmitPanel token={screen.token} daily={daily !== undefined} />
              {daily !== undefined ? (
                <p className={s.dailyNext}>
                  One daily seed per day.{" "}
                  <Link href={playHref("cup8", loadPanel())}>Play a regular challenge</Link> for a
                  fresh one.
                </p>
              ) : null}
            </>
          )
        }
      />
    );
  }

  return (
    <DraftBoard
      title={title}
      navFamily={daily === undefined ? "play" : "daily"}
      run={screen.run}
      failure={failure}
      showRatings={showRatings}
      onRun={(run) => show({ kind: "draft", run })}
      onAction={(action) => show({ kind: "draft", run: step(screen.run, action) })}
      onNewRun={newRun}
      onSeeResults={() => seeResults(screen.run)}
    />
  );
}
