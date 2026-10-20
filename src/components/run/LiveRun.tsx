"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { HeadToHead, opponentOf } from "@/components/results/HeadToHead";
import { focusHeading } from "@/ui/focus";
import { loadPanel, playHref, playsMatchday, type MatchView } from "@/ui/settings";
import type { Versus } from "@/ui/versus";
import { DraftBoard } from "./DraftBoard";
import { runToken, startRun, step, type Run } from "./runState";
import { forgetRun, saveRun, type MatchdayAt, type Restored, type RunSlot } from "./savedRun";
import s from "./PlayScreen.module.css";

type MatchdayScreen = Extract<Restored, { kind: "matchday" }> & { readonly ctx: CupContext };
type Screen = Exclude<Restored, { kind: "matchday" }> | MatchdayScreen;
export { restoreFriendly, restoreRun } from "./savedRun";

function matchdayScreen(
  run: Run,
  token: string,
  draft: DraftState,
  cup: CupResult,
  at: { actions: readonly ManagerAction[]; match: number; view: MatchView; managerMode: boolean },
): MatchdayScreen {
  const ctx = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };
  const { actions, match, view, managerMode } = at;
  return { kind: "matchday", run, token, draft, cup, ctx, actions, match, view, managerMode };
}

// The snapshot's token is the draft's own token with the decisions so far.
function saveMatchday(
  slot: RunSlot,
  token: string,
  manager: readonly ManagerAction[],
  at: MatchdayAt,
): void {
  saveRun(slot, "matchday", encodeToken({ ...decodeToken(token), manager: [...manager] }), {
    match: at.match,
    view: at.view,
    managerMode: at.managerMode,
  });
}

function firstPlayed(cup: CupResult): number {
  return cup.matches.findIndex((m) => m.status === "played");
}

type Settled = Exclude<Restored, { kind: "draft" }>;

// A finished draft plays its cup on the matchday when the panel asks for it, else shows results.
function afterDraft(run: Run, token: string, draft: DraftState, cup: CupResult): Settled {
  const panel = loadPanel();
  if (!playsMatchday(panel)) return { kind: "results", token, draft, cup };
  return {
    kind: "matchday",
    run,
    token,
    draft,
    cup,
    actions: [],
    match: firstPlayed(cup),
    view: panel.matchView,
    managerMode: panel.managerMode,
  };
}

/** Where a friendly cup from the home builder opens: its matchday or its results. */
export function friendlyStart(token: string, draft: DraftState, cup: CupResult): Settled {
  const { settings, seed, actions } = decodeToken(token);
  return afterDraft(actions.reduce(step, startRun(settings, seed)), token, draft, cup);
}

function screenOf(initial: Restored): Screen {
  if (initial.kind !== "matchday") return initial;
  return matchdayScreen(initial.run, initial.token, initial.draft, initial.cup, initial);
}

// The draft and the results. PlayScreen loads this module (and the species data under it) with
// import() at Start, so the start panel's first load carries none of it.
export function LiveRun({
  settings,
  seed,
  daily,
  title,
  initial,
  vs = null,
  onNewRun,
}: {
  readonly settings: DraftSettings;
  readonly seed: string;
  readonly daily?: IsoDate;
  readonly title: string;
  readonly initial: Restored | null;
  readonly vs?: Versus | null;
  readonly onNewRun: () => void;
}) {
  const slot: RunSlot = { settings, seed, daily: daily ?? null };
  const [screen, setScreen] = useState<Screen>(() =>
    initial === null ? { kind: "draft", run: startRun(settings, seed) } : screenOf(initial),
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [showRatings] = useState(() => loadPanel().showChallengeRatings);
  const [kickOff] = useState(() => playsMatchday(loadPanel()));
  const [spinSpeed] = useState(() => loadPanel().spinSpeed);
  // A friendly from the builder follows the builder's own ratings switch.
  const [matchRatings] = useState(() => {
    const panel = loadPanel();
    return settings.mode === "builder" ? panel.showRatings : panel.showChallengeRatings;
  });
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
    else saveMatchday(slot, next.token, next.actions, next);
    setScreen(next);
  };

  const seeResults = (run: Run) => {
    const token = runToken(run);
    try {
      const { draft, cup } = replay(token);
      show(screenOf(afterDraft(run, token, draft, cup)));
      window.scrollTo({ top: 0 });
    } catch {
      setFailure("This run could not be scored. Start a new run.");
    }
  };

  const matchdayToken = screen.kind === "matchday" ? screen.token : null;
  const matchdayView = screen.kind === "matchday" ? screen.view : null;
  const matchdayManaged = screen.kind === "matchday" && screen.managerMode;
  // Each decision and each new match is checkpointed, so a reload comes back to this match.
  const progressMatchday = useCallback(
    (manager: readonly ManagerAction[], match: number) => {
      if (matchdayToken === null || matchdayView === null) return;
      saveMatchday({ settings, seed, daily: daily ?? null }, matchdayToken, manager, {
        match,
        view: matchdayView,
        managerMode: matchdayManaged,
      });
    },
    [matchdayToken, matchdayView, matchdayManaged, settings, seed, daily],
  );
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

  const atResults = screen.kind === "results";
  const opponent = useMemo(
    () => (atResults && vs !== null ? opponentOf(vs) : null),
    [atResults, vs],
  );

  const newRun = () => {
    // A matchday's snapshot changes with every decision, so this tab's own copy names it.
    forgetRun(
      slot,
      screen.kind === "matchday"
        ? undefined
        : {
            screen: screen.kind,
            token: screen.kind === "results" ? screen.token : runToken(screen.run),
          },
    );
    onNewRun();
  };

  if (screen.kind === "matchday") {
    return (
      <MatchdayFlow
        ctx={screen.ctx}
        initialCup={screen.cup}
        initialActions={screen.actions}
        initialMatch={screen.match}
        view={screen.view}
        managerMode={screen.managerMode}
        showRatings={matchRatings}
        onProgress={progressMatchday}
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
        versus={
          opponent === null ? undefined : (
            <HeadToHead token={screen.token} mine={screen} theirs={opponent} />
          )
        }
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
      kickOff={kickOff}
      spinSpeed={spinSpeed}
    />
  );
}
